import { asc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '$lib/database'
import type { PgColumn } from 'drizzle-orm/pg-core'
import {
  bonusItems,
  ingredients,
  userIngredients,
  legalDocumentEvents,
  mealFavorites,
  mealIngredients,
  mealTranslations,
  meals,
  plans,
  recipeImports,
  slotRepeats,
  savedExtras,
  users,
  userSettings,
  weekSlots,
} from '$lib/database/schema'
import type { LegalNotice } from '$lib/legal'
import { ingredientOptionColumns } from './ingredients'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const { userId: _mealOwnerId, ...accountRecipeColumns } = getTableColumns(meals)
const { userId: _planOwnerId, ...accountPlanColumns } = getTableColumns(plans)

async function lockAdminIds(tx: Tx) {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .orderBy(asc(users.id))
    .for('update')
  return admins.map((admin) => admin.id)
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

export async function findUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      isPro: users.isPro,
    })
    .from(users)
    .orderBy(asc(users.email))
}

export async function updateUserAdmin(
  actingUserId: number,
  id: number,
  isAdmin: boolean,
) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (!adminIds.includes(actingUserId)) return false

    const [user] = await tx
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isPro: users.isPro,
      })
    return user ?? null
  })
}

export async function updateUserPro(
  actingUserId: number,
  id: number,
  isPro: boolean,
) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (!adminIds.includes(actingUserId)) return false

    const [user] = await tx
      .update(users)
      .set({ isPro })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isPro: users.isPro,
      })
    return user ?? null
  })
}

export async function createUser(
  email: string,
  passwordHash: string,
  legalNotices: readonly LegalNotice[],
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash })
      .returning()
    await tx.insert(legalDocumentEvents).values(
      legalNotices.map(({ document, version, action }) => ({
        userId: user.id,
        document,
        version,
        action,
      })),
    )
    return user
  })
}

export async function updatePassword(id: number, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

export async function getSettings(userId: number) {
  const [settings] = await db
    .select({
      locale: userSettings.locale,
      cuisinePrefs: userSettings.cuisinePrefs,
      dietaryRestrictions: userSettings.dietaryRestrictions,
      pantryStaples: userSettings.pantryStaples,
      pantryIngredientIds: userSettings.pantryIngredientIds,
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
      fiberTarget: userSettings.fiberTarget,
      sugarTarget: userSettings.sugarTarget,
      saturatedFatTarget: userSettings.saturatedFatTarget,
      saltTarget: userSettings.saltTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)
  return settings ?? null
}

export async function saveSettings(
  userId: number,
  patch: Record<string, unknown>,
) {
  const [settings] = await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch })
    .returning()
  return settings
}

// Single-table selects otherwise strip qualifiers even inside correlated SQL.
function qualifiedColumn(column: PgColumn) {
  return sql`${column.table}.${sql.identifier(column.name)}`
}

export async function getAccountExport(userId: number) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ email: users.email, isPro: users.isPro })
      .from(users)
      .where(eq(users.id, userId))
    const [settingsRow] = await tx
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
    const recipeRows = await tx
      .select({
        ...accountRecipeColumns,
        ingredients: sql<
          { name: string; qty: number | null; unit: string | null }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'name', coalesce(${qualifiedColumn(mealIngredients.originalName)}, ${qualifiedColumn(ingredients.name)}),
              'qty', ${qualifiedColumn(mealIngredients.qty)}::float,
              'unit', ${qualifiedColumn(mealIngredients.unit)}
            ) order by ${qualifiedColumn(mealIngredients.position)}
          )
          from ${mealIngredients}
          inner join ${ingredients}
            on ${qualifiedColumn(ingredients.id)} = ${qualifiedColumn(mealIngredients.ingredientId)}
          where ${qualifiedColumn(mealIngredients.mealId)} = ${qualifiedColumn(meals.id)}
        ), '[]'::jsonb)`,
        translations: sql<
          {
            locale: string
            name: string | null
            description: string | null
            instructions: string | null
          }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'locale', ${qualifiedColumn(mealTranslations.locale)},
              'name', ${qualifiedColumn(mealTranslations.name)},
              'description', ${qualifiedColumn(mealTranslations.description)},
              'instructions', ${qualifiedColumn(mealTranslations.instructions)}
            ) order by ${qualifiedColumn(mealTranslations.locale)}
          )
          from ${mealTranslations}
          where ${qualifiedColumn(mealTranslations.mealId)} = ${qualifiedColumn(meals.id)}
        ), '[]'::jsonb)`,
      })
      .from(meals)
      .where(eq(meals.userId, userId))
    const planRows = await tx
      .select({
        ...accountPlanColumns,
        slots: sql<
          { date: string; mealType: string; mealId: number }[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'date', ${qualifiedColumn(weekSlots.date)},
              'mealType', ${qualifiedColumn(weekSlots.mealType)},
              'mealId', ${qualifiedColumn(weekSlots.mealId)}
            ) order by ${qualifiedColumn(weekSlots.date)}, ${qualifiedColumn(weekSlots.mealType)}
          )
          from ${weekSlots}
          where ${qualifiedColumn(weekSlots.planId)} = ${qualifiedColumn(plans.id)}
        ), '[]'::jsonb)`,
        bonusItems: sql<
          Omit<typeof bonusItems.$inferSelect, 'planId'>[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ${qualifiedColumn(bonusItems.id)},
              'date', ${qualifiedColumn(bonusItems.date)},
              'name', ${qualifiedColumn(bonusItems.name)},
              'calories', ${qualifiedColumn(bonusItems.calories)},
              'proteinG', ${qualifiedColumn(bonusItems.proteinG)}::text,
              'carbsG', ${qualifiedColumn(bonusItems.carbsG)}::text,
              'fatG', ${qualifiedColumn(bonusItems.fatG)}::text,
              'fiberG', ${qualifiedColumn(bonusItems.fiberG)}::text,
              'sugarG', ${qualifiedColumn(bonusItems.sugarG)}::text,
              'saturatedFatG', ${qualifiedColumn(bonusItems.saturatedFatG)}::text,
              'saltG', ${qualifiedColumn(bonusItems.saltG)}::text
            ) order by ${qualifiedColumn(bonusItems.date)}, ${qualifiedColumn(bonusItems.id)}
          )
          from ${bonusItems}
          where ${qualifiedColumn(bonusItems.planId)} = ${qualifiedColumn(plans.id)}
        ), '[]'::jsonb)`,
        slotRepeats: sql<
          Omit<typeof slotRepeats.$inferSelect, 'planId'>[]
        >`coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'mealType', ${qualifiedColumn(slotRepeats.mealType)},
              'groupBreaks', ${qualifiedColumn(slotRepeats.groupBreaks)}
            ) order by ${qualifiedColumn(slotRepeats.mealType)}
          )
          from ${slotRepeats}
          where ${qualifiedColumn(slotRepeats.planId)} = ${qualifiedColumn(plans.id)}
        ), '[]'::jsonb)`,
      })
      .from(plans)
      .where(eq(plans.userId, userId))
    const [{ mealIds: favoriteMealIds }] = await tx
      .select({
        mealIds: sql<
          number[]
        >`coalesce(array_agg(${qualifiedColumn(mealFavorites.mealId)} order by ${qualifiedColumn(mealFavorites.mealId)}), array[]::integer[])`,
      })
      .from(mealFavorites)
      .where(eq(mealFavorites.userId, userId))
    const imports = await tx
      .select({
        id: recipeImports.id,
        recipe: recipeImports.recipe,
        status: recipeImports.status,
        mealId: recipeImports.mealId,
        createdAt: recipeImports.createdAt,
        reviewedAt: recipeImports.reviewedAt,
      })
      .from(recipeImports)
      .where(eq(recipeImports.submittedBy, userId))
    const legalEvents = await tx
      .select({
        document: legalDocumentEvents.document,
        version: legalDocumentEvents.version,
        action: legalDocumentEvents.action,
        occurredAt: legalDocumentEvents.occurredAt,
      })
      .from(legalDocumentEvents)
      .where(eq(legalDocumentEvents.userId, userId))

    const settings = settingsRow
      ? (({ userId: _userId, ...value }) => value)(settingsRow)
      : null
    const extras = await tx
      .select()
      .from(savedExtras)
      .where(eq(savedExtras.userId, userId))
    const customIngredients = await tx
      .select(ingredientOptionColumns)
      .from(userIngredients)
      .innerJoin(ingredients, eq(ingredients.id, userIngredients.ingredientId))
      .where(eq(userIngredients.userId, userId))
    return {
      customIngredients,
      version: 1,
      account: { email: account?.email, isPro: account?.isPro, settings },
      recipes: recipeRows,
      plans: planRows,
      favoriteMealIds,
      recipeImports: imports,
      legalDocumentEvents: legalEvents,
      savedExtras: extras.map(({ userId: _userId, ...extra }) => extra),
    }
  })
}

export async function deleteAccount(userId: number) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (adminIds.length === 1 && adminIds[0] === userId) return false
    const personal = await tx
      .select({ id: userIngredients.ingredientId })
      .from(userIngredients)
      .where(eq(userIngredients.userId, userId))
    await tx.delete(users).where(eq(users.id, userId))
    if (personal.length)
      await tx.execute(
        sql`delete from ingredients where id = any(${sql.param(personal.map((row) => row.id))}::int[]) and not is_catalog and not exists (select 1 from user_ingredients where ingredient_id = ingredients.id) and not exists (select 1 from meal_ingredients where ingredient_id = ingredients.id)`,
      )
    return true
  })
}

export async function listUserMealIds(userId: number) {
  const rows = await db
    .select({ id: meals.id })
    .from(meals)
    .where(eq(meals.userId, userId))
  return rows.map(({ id }) => id)
}
