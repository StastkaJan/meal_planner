import { and, or, isNull, eq, inArray, getTableColumns, sql } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  meals,
  mealFavorites,
  ingredients,
  mealIngredients,
  mealTranslations,
} from '$lib/database/schema'
import type { IngredientInput } from '$lib/types'
import type { Locale } from '$lib/i18n'
import { getHouseholdAccess } from './households'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function listMeals(userId?: number, locale: Locale = 'en') {
  const access = userId == null ? null : await getHouseholdAccess(userId)
  const visibleUserIds = access?.userIds ?? (userId == null ? [] : [userId])
  const rows = await db
    .select({
      ...getTableColumns(meals),
      name: sql<string>`coalesce(${mealTranslations.name}, ${meals.name})`,
      description: sql<
        string | null
      >`coalesce(${mealTranslations.description}, ${meals.description})`,
      instructions: sql<
        string | null
      >`coalesce(${mealTranslations.instructions}, ${meals.instructions})`,
    })
    .from(meals)
    .leftJoin(
      mealTranslations,
      and(
        eq(mealTranslations.mealId, meals.id),
        eq(mealTranslations.locale, locale),
      ),
    )
    .where(
      and(
        isNull(meals.archivedAt),
        userId == null
          ? isNull(meals.userId)
          : or(isNull(meals.userId), inArray(meals.userId, visibleUserIds)),
      ),
    )
    .orderBy(sql`coalesce(${mealTranslations.name}, ${meals.name})`)
  return rows.map((meal) => ({
    ...meal,
    isOwner: meal.userId === userId,
    canEdit:
      meal.userId === userId ||
      (meal.userId !== null && Boolean(access?.canEdit)),
  }))
}

export async function findMeal(id: number, userId?: number) {
  const access = userId == null ? null : await getHouseholdAccess(userId)
  const visibleUserIds = access?.userIds ?? (userId == null ? [] : [userId])
  const [meal] = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.id, id),
        isNull(meals.archivedAt),
        userId == null
          ? isNull(meals.userId)
          : or(isNull(meals.userId), inArray(meals.userId, visibleUserIds)),
      ),
    )
    .limit(1)
  return meal
    ? {
        ...meal,
        isOwner: meal.userId === userId,
        canEdit:
          meal.userId === userId ||
          (meal.userId !== null && Boolean(access?.canEdit)),
      }
    : null
}

export async function getMealIngredients(mealId: number) {
  const rows = await db
    .select({
      name: ingredients.name,
      qty: mealIngredients.qty,
      unit: mealIngredients.unit,
    })
    .from(mealIngredients)
    .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(eq(mealIngredients.mealId, mealId))
    .orderBy(mealIngredients.position)
  return rows.map((row) => ({
    ...row,
    qty: row.qty !== null ? Number(row.qty) : null,
  }))
}

export async function getMealTranslations(mealId: number) {
  return db
    .select()
    .from(mealTranslations)
    .where(eq(mealTranslations.mealId, mealId))
    .orderBy(mealTranslations.locale)
}

export async function saveMealTranslation(
  mealId: number,
  locale: Locale,
  values: Pick<
    typeof mealTranslations.$inferInsert,
    'name' | 'description' | 'ingredients' | 'instructions'
  >,
) {
  const [translation] = await db
    .insert(mealTranslations)
    .values({ mealId, locale, ...values })
    .onConflictDoUpdate({
      target: [mealTranslations.mealId, mealTranslations.locale],
      set: values,
    })
    .returning()
  return translation
}

export async function deleteMealTranslation(mealId: number, locale: Locale) {
  await db
    .delete(mealTranslations)
    .where(
      and(
        eq(mealTranslations.mealId, mealId),
        eq(mealTranslations.locale, locale),
      ),
    )
}

export async function findAllowedMeal(
  id: number,
  userId: number,
): Promise<{ id: number; allowedSlots: string[] } | null> {
  const access = await getHouseholdAccess(userId)
  const visibleUserIds = access?.userIds ?? [userId]
  const [meal] = await db
    .select({ id: meals.id, allowedSlots: meals.allowedSlots })
    .from(meals)
    .where(
      and(
        eq(meals.id, id),
        isNull(meals.archivedAt),
        or(isNull(meals.userId), inArray(meals.userId, visibleUserIds)),
      ),
    )
    .limit(1)
  return meal ?? null
}

export async function findEditableMeal(
  id: number,
  userId: number,
  isAdmin = false,
) {
  const access = await getHouseholdAccess(userId)
  const editableUserIds = access?.canEdit ? access.userIds : [userId]
  const [meal] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(
      and(
        eq(meals.id, id),
        isAdmin
          ? or(isNull(meals.userId), inArray(meals.userId, editableUserIds))
          : inArray(meals.userId, editableUserIds),
        isNull(meals.archivedAt),
      ),
    )
    .limit(1)
  return meal ?? null
}

export async function listCandidateMeals(userId: number) {
  const access = await getHouseholdAccess(userId)
  const visibleUserIds = access?.userIds ?? [userId]
  return db
    .select({
      id: meals.id,
      calories: meals.calories,
      tags: meals.tags,
      allowedSlots: meals.allowedSlots,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(meals)
    .where(
      and(
        isNull(meals.archivedAt),
        or(isNull(meals.userId), inArray(meals.userId, visibleUserIds)),
      ),
    )
}

export async function archiveMeal(id: number) {
  const [meal] = await db
    .update(meals)
    .set({ archivedAt: new Date() })
    .where(eq(meals.id, id))
    .returning()
  return meal
}

export async function setMealFavorite(
  userId: number,
  mealId: number,
  favorite: boolean,
) {
  if (favorite) {
    await db
      .insert(mealFavorites)
      .values({ userId, mealId })
      .onConflictDoNothing()
    return
  }
  await db
    .delete(mealFavorites)
    .where(
      and(eq(mealFavorites.userId, userId), eq(mealFavorites.mealId, mealId)),
    )
}

export async function favoriteMealIds(userId?: number): Promise<Set<number>> {
  if (userId == null) return new Set()
  const rows = await db
    .select({ mealId: mealFavorites.mealId })
    .from(mealFavorites)
    .where(eq(mealFavorites.userId, userId))
  return new Set(rows.map((r) => r.mealId))
}

// ---- structured ingredient links (source of truth for a meal's ingredients) ----

// Resolves each name to its ingredients.id, creating any that don't exist yet. Batched (one
// insert + one select for the whole set) instead of one round-trip pair per name.
async function findOrCreateIngredientIds(
  tx: Tx,
  names: string[],
): Promise<Map<string, number>> {
  if (!names.length) return new Map()
  await tx
    .insert(ingredients)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing({ target: ingredients.name })
  const rows = await tx
    .select({ id: ingredients.id, name: ingredients.name })
    .from(ingredients)
    .where(inArray(ingredients.name, names))
  return new Map(rows.map((r) => [r.name, r.id]))
}

// Replaces a meal's structured ingredient rows. Call this whenever a meal's ingredients are
// written so mealIngredients stays in sync — the shopping list sums the qty column here.
export async function syncMealIngredients(
  tx: Tx,
  mealId: number,
  items: IngredientInput[],
) {
  await tx.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId))
  const cleaned = items
    .map((it) => ({ ...it, name: it.name.trim() }))
    .filter((it) => it.name)
  if (!cleaned.length) return

  const displayName = (name: string) => name[0].toUpperCase() + name.slice(1)
  const names = [...new Set(cleaned.map((it) => displayName(it.name)))]
  const idByName = await findOrCreateIngredientIds(tx, names)

  await tx.insert(mealIngredients).values(
    cleaned.map((it, position) => ({
      mealId,
      ingredientId: idByName.get(displayName(it.name))!,
      position,
      qty: it.qty !== null ? String(it.qty) : null,
      unit: it.unit,
    })),
  )
}

// Single choke point for meal creation: insert + structured-ingredient sync, one transaction.
export async function createMeal(values: {
  name: string
  ingredients?: IngredientInput[]
  translations?: Omit<typeof mealTranslations.$inferInsert, 'mealId'>[]
  [k: string]: unknown
}) {
  const {
    ingredients: ingredientInput,
    translations: translationInput,
    ...mealValues
  } = values
  return db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values(mealValues).returning()
    await syncMealIngredients(tx, meal.id, ingredientInput ?? [])
    if (translationInput?.length)
      await tx.insert(mealTranslations).values(
        translationInput.map((translation) => ({
          ...translation,
          mealId: meal.id,
        })),
      )
    return meal
  })
}

// Single choke point for meal updates: update + structured-ingredient resync (only when
// ingredients was part of this write), one transaction.
export async function updateMeal(id: number, values: Record<string, unknown>) {
  const { ingredients: ingredientInput, ...mealValues } = values
  return db.transaction(async (tx) => {
    // An ingredients-only write (nothing else changed) leaves mealValues empty — drizzle's
    // .set({}) throws, so just look the row up instead of no-op updating it.
    const [updated] = Object.keys(mealValues).length
      ? await tx
          .update(meals)
          .set(mealValues)
          .where(eq(meals.id, id))
          .returning()
      : await tx.select().from(meals).where(eq(meals.id, id))
    if (!updated) return updated
    if (ingredientInput !== undefined) {
      await syncMealIngredients(tx, id, ingredientInput as IngredientInput[])
    }
    return updated
  })
}
