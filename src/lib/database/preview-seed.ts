import { eq, inArray, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { CURRENT_LEGAL_DOCUMENTS } from '../legal'
import { addDays, mondayOf } from '../utils/date-time'
import { hashPassword } from '../server/services/auth'
import { validateCatalogueRecipe } from '../server/services/catalogue-imports'
import { syncMealIngredients } from '../server/repositories/meals'

export const DEMO_PASSWORD = 'DemoPapu2026!'
export const DEMO_USERS = [
  { email: 'free@demo.test', isAdmin: false, isPro: false, locale: 'en' },
  { email: 'pro@demo.test', isAdmin: false, isPro: true, locale: 'cs' },
  { email: 'admin@demo.test', isAdmin: true, isPro: false, locale: 'en' },
  { email: 'admin-pro@demo.test', isAdmin: true, isPro: true, locale: 'cs' },
] as const

export function assertPreviewSeedTarget(env: NodeJS.ProcessEnv) {
  if (!/^pr-[1-9]\d*$/.test(env.PREVIEW_ID ?? ''))
    throw new Error('Demo accounts require a PREVIEW_ID such as pr-42')
  const url = new URL(env.DATABASE_URL ?? '')
  if (url.hostname !== 'db' || url.pathname !== '/mealplan')
    throw new Error('Demo accounts require the preview Compose database')
}

export async function seedPreviewAccounts(
  db: NodePgDatabase<typeof schema>,
  today = new Date().toISOString().slice(0, 10),
) {
  const week = mondayOf(today)
  return db.transaction(async (tx) => {
    const accounts = await tx
      .insert(schema.users)
      .values(
        await Promise.all(
          DEMO_USERS.map(async ({ locale: _locale, ...user }) => ({
            ...user,
            passwordHash: await hashPassword(DEMO_PASSWORD),
          })),
        ),
      )
      .onConflictDoNothing({ target: schema.users.email })
      .returning()
    // Existing demo accounts and their edits are preserved on every redeploy.
    if (!accounts.length) return 0

    const shared = await tx
      .select()
      .from(schema.meals)
      .where(isNull(schema.meals.userId))
      .orderBy(schema.meals.id)
    const source = (name: string) => {
      const meal = shared.find((meal) => meal.name === name)
      if (!meal) throw new Error(`Missing sample recipe: ${name}`)
      return meal
    }
    const oats = source('Oatmeal with Berries')
    const soup = source('Lentil Soup')
    const chicken = source('Grilled Chicken Salad')
    const ingredientRows = await tx
      .select({
        mealId: schema.mealIngredients.mealId,
        name: schema.ingredients.name,
        qty: schema.mealIngredients.qty,
        unit: schema.mealIngredients.unit,
      })
      .from(schema.mealIngredients)
      .innerJoin(
        schema.ingredients,
        eq(schema.ingredients.id, schema.mealIngredients.ingredientId),
      )
      .where(
        inArray(schema.mealIngredients.mealId, [oats.id, soup.id, chicken.id]),
      )
      .orderBy(schema.mealIngredients.position)

    for (const account of accounts) {
      const config = DEMO_USERS.find(({ email }) => email === account.email)!
      await tx.insert(schema.legalDocumentEvents).values(
        CURRENT_LEGAL_DOCUMENTS.map(({ document, version, action }) => ({
          userId: account.id,
          document,
          version,
          action,
        })),
      )
      await tx.insert(schema.userSettings).values({
        userId: account.id,
        locale: config.locale,
        pantryStaples: ['Salt and pepper', 'Olive oil'],
        calorieTarget: 2000,
        proteinTarget: 120,
        carbsTarget: 250,
        fatTarget: 65,
      })
      const personal = []
      for (const [index, original] of [oats, soup, chicken].entries()) {
        const { id: _id, ...recipe } = original
        const [meal] = await tx
          .insert(schema.meals)
          .values({
            ...recipe,
            userId: account.id,
            name: `${account.email.split('@')[0]}'s ${recipe.name}`,
            allowedSlots: index === 0 ? ['breakfast'] : ['lunch', 'dinner'],
            servings: 2,
            fiberG: '6.00',
            sugarG: '4.00',
            saturatedFatG: '1.50',
            saltG: '0.60',
            archivedAt: index === 2 ? new Date(`${today}T12:00:00Z`) : null,
          })
          .returning()
        const ingredients = ingredientRows
          .filter(({ mealId }) => mealId === original.id)
          .map(({ name, qty, unit }) => ({
            name,
            qty: qty === null ? null : (Number(qty) * 2) / original.servings,
            unit,
          }))
        await syncMealIngredients(tx, meal.id, ingredients)
        personal.push(meal)
      }
      await tx.insert(schema.mealTranslations).values({
        mealId: personal[0].id,
        locale: 'cs',
        name: 'Moje ovesná kaše s ovocem',
        description: 'Domácí ovesná kaše s čerstvým ovocem.',
        ingredients: ['Ovesné vločky', 'Voda', 'Lesní ovoce', 'Med'],
        instructions:
          'Přiveďte vodu k varu. Přidejte vločky a vařte 5 minut. Podávejte s ovocem a medem.',
      })
      await tx.insert(schema.mealFavorites).values([
        { userId: account.id, mealId: chicken.id },
        { userId: account.id, mealId: personal[0].id },
        { userId: account.id, mealId: personal[1].id },
      ])
      const [plan] = await tx
        .insert(schema.plans)
        .values({
          userId: account.id,
          name: `${account.email.split('@')[0]}'s demo week`,
          portions: 2,
          weekStart: week,
        })
        .returning()
      for (const monday of [addDays(week, -7), week]) {
        const slots = []
        for (let day = 0; day < 7; day++) {
          const daily = {
            breakfast: personal[0].id,
            morning_snack: source('Apple and Almond Butter').id,
            lunch: day % 2 ? soup.id : chicken.id,
            afternoon_snack: source('Greek Yogurt with Honey').id,
            dinner:
              day < 2 ? personal[1].id : source('Salmon with Sweet Potato').id,
          }
          for (const [mealType, mealId] of Object.entries(daily))
            slots.push({
              planId: plan.id,
              date: addDays(monday, day),
              mealType,
              mealId,
            })
        }
        await tx.insert(schema.weekSlots).values(slots)
        await tx.insert(schema.bonusItems).values({
          planId: plan.id,
          date: monday,
          name: 'Demo café latte',
          calories: 120,
          proteinG: '6.0',
          carbsG: '10.0',
          fatG: '6.0',
          fiberG: '0.00',
          sugarG: '10.00',
          saturatedFatG: '3.50',
          saltG: '0.15',
        })
      }
      await tx.insert(schema.slotRepeats).values({
        planId: plan.id,
        mealType: 'dinner',
        groupBreaks: [false, true, true, true, true, true],
      })
      if (account.email === 'admin@demo.test') {
        for (const status of ['pending', 'approved', 'rejected']) {
          const recipe = {
            name:
              status === 'approved' ? soup.name : `Demo ${status} lentil soup`,
            description: soup.description,
            instructions: soup.instructions,
            ingredients: [{ name: 'Red lentils', qty: 1, unit: 'cup' }],
          }
          const entry = validateCatalogueRecipe(recipe).value!
          await tx
            .insert(schema.recipeImports)
            .values({
              ...entry,
              submittedBy: account.id,
              status,
              mealId: status === 'approved' ? soup.id : null,
              reviewedAt:
                status === 'pending' ? null : new Date(`${today}T12:00:00Z`),
            })
            .onConflictDoNothing()
        }
      }
    }
    return accounts.length
  })
}
