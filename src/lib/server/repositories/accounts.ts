import { asc, eq } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  bonusItems,
  ingredients,
  legalDocumentEvents,
  mealFavorites,
  mealIngredients,
  mealTranslations,
  meals,
  plans,
  recipeImports,
  slotRepeats,
  users,
  userSettings,
  weekSlots,
} from '$lib/database/schema'
import type { LegalNotice } from '$lib/legal'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

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
    .select({ id: users.id, email: users.email, isAdmin: users.isAdmin })
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
      .returning({ id: users.id, email: users.email, isAdmin: users.isAdmin })
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
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
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

export async function getAccountExport(userId: number) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
    const [settingsRow] = await tx
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
    const recipeRows = await tx
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
    const ingredientRows = await tx
      .select({
        mealId: mealIngredients.mealId,
        name: ingredients.name,
        qty: mealIngredients.qty,
        unit: mealIngredients.unit,
      })
      .from(mealIngredients)
      .innerJoin(meals, eq(mealIngredients.mealId, meals.id))
      .innerJoin(ingredients, eq(mealIngredients.ingredientId, ingredients.id))
      .where(eq(meals.userId, userId))
      .orderBy(mealIngredients.position)
    const translationRows = await tx
      .select({
        mealId: mealTranslations.mealId,
        locale: mealTranslations.locale,
        name: mealTranslations.name,
        description: mealTranslations.description,
        instructions: mealTranslations.instructions,
      })
      .from(mealTranslations)
      .innerJoin(meals, eq(mealTranslations.mealId, meals.id))
      .where(eq(meals.userId, userId))
    const planRows = await tx
      .select()
      .from(plans)
      .where(eq(plans.userId, userId))
    const slots = await tx
      .select({
        planId: weekSlots.planId,
        date: weekSlots.date,
        mealType: weekSlots.mealType,
        mealId: weekSlots.mealId,
      })
      .from(weekSlots)
      .innerJoin(plans, eq(weekSlots.planId, plans.id))
      .where(eq(plans.userId, userId))
    const bonuses = await tx
      .select({
        id: bonusItems.id,
        planId: bonusItems.planId,
        date: bonusItems.date,
        name: bonusItems.name,
        calories: bonusItems.calories,
        proteinG: bonusItems.proteinG,
        carbsG: bonusItems.carbsG,
        fatG: bonusItems.fatG,
        fiberG: bonusItems.fiberG,
        sugarG: bonusItems.sugarG,
        saturatedFatG: bonusItems.saturatedFatG,
        saltG: bonusItems.saltG,
      })
      .from(bonusItems)
      .innerJoin(plans, eq(bonusItems.planId, plans.id))
      .where(eq(plans.userId, userId))
    const repeats = await tx
      .select({
        planId: slotRepeats.planId,
        mealType: slotRepeats.mealType,
        groupBreaks: slotRepeats.groupBreaks,
      })
      .from(slotRepeats)
      .innerJoin(plans, eq(slotRepeats.planId, plans.id))
      .where(eq(plans.userId, userId))
    const favorites = await tx
      .select({ mealId: mealFavorites.mealId })
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
    return {
      version: 1,
      account: { email: account?.email, settings },
      recipes: recipeRows.map(({ userId: _userId, ...recipe }) => ({
        ...recipe,
        ingredients: ingredientRows
          .filter((item) => item.mealId === recipe.id)
          .map(({ mealId: _mealId, ...item }) => ({
            ...item,
            qty: item.qty === null ? null : Number(item.qty),
          })),
        translations: translationRows
          .filter((translation) => translation.mealId === recipe.id)
          .map(({ mealId: _mealId, ...translation }) => translation),
      })),
      plans: planRows.map(({ userId: _userId, ...plan }) => ({
        ...plan,
        slots: slots
          .filter((slot) => slot.planId === plan.id)
          .map(({ planId: _planId, ...slot }) => slot),
        bonusItems: bonuses
          .filter((item) => item.planId === plan.id)
          .map(({ planId: _planId, ...item }) => item),
        slotRepeats: repeats
          .filter((repeat) => repeat.planId === plan.id)
          .map(({ planId: _planId, ...repeat }) => repeat),
      })),
      favoriteMealIds: favorites.map(({ mealId }) => mealId),
      recipeImports: imports,
      legalDocumentEvents: legalEvents,
    }
  })
}

export async function deleteAccount(userId: number) {
  return db.transaction(async (tx) => {
    const adminIds = await lockAdminIds(tx)
    if (adminIds.length === 1 && adminIds[0] === userId) return false
    await tx.delete(users).where(eq(users.id, userId))
    return true
  })
}
