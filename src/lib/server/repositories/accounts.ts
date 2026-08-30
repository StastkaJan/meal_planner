import { eq } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  bonusItems,
  ingredients,
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

export async function createUser(email: string, passwordHash: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning()
  return user
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
    }
  })
}

export async function deleteAccount(userId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.id, userId))
  })
}
