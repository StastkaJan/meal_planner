import { and, or, isNull, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals, mealFavorites, ingredients, mealIngredients } from '$lib/schema'
import type { IngredientInput } from '$lib/types'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// A meal is visible to a user if it's global (no owner) or owned by them. An anonymous
// caller (no userId) sees only global meals. Visibility and edit-permission are the same
// set: if you can see a meal, it's yours to edit/delete.
export const visibleToUser = (userId?: number) =>
  userId == null
    ? and(isNull(meals.userId), isNull(meals.archivedAt))
    : and(
        isNull(meals.archivedAt),
        or(isNull(meals.userId), eq(meals.userId, userId)),
      )

export const canAccessMeal = (
  meal: { userId: number | null; archivedAt: Date | null },
  userId?: number,
) =>
  meal.archivedAt === null && (meal.userId === null || meal.userId === userId)

export async function listMeals(userId?: number) {
  return db
    .select()
    .from(meals)
    .where(visibleToUser(userId))
    .orderBy(meals.name)
}

export async function findMeal(id: number, userId?: number) {
  const [meal] = await db.select().from(meals).where(eq(meals.id, id)).limit(1)
  return meal && canAccessMeal(meal, userId) ? meal : null
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

export async function findAllowedMeal(
  id: number,
  userId: number,
): Promise<{ id: number; allowedSlots: string[] } | null> {
  const [meal] = await db
    .select({ id: meals.id, allowedSlots: meals.allowedSlots })
    .from(meals)
    .where(and(eq(meals.id, id), visibleToUser(userId)))
    .limit(1)
  return meal ?? null
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

// error() is imported lazily so this module stays loadable from the standalone
// seed/backfill scripts (run via bare tsx, outside SvelteKit's resolver — see
// syncMealIngredients callers), which don't have @sveltejs/kit installed.
export async function assertCanEdit(id: number, userId: number) {
  const [meal] = await db
    .select({ userId: meals.userId, archivedAt: meals.archivedAt })
    .from(meals)
    .where(eq(meals.id, id))
    .limit(1)
  if (!meal || !canAccessMeal(meal, userId)) {
    const { error } = await import('@sveltejs/kit')
    error(!meal ? 404 : 403, !meal ? 'Meal not found' : 'Not allowed')
  }
}

export async function favoriteMealIds(userId?: number): Promise<Set<number>> {
  if (userId == null) return new Set()
  const rows = await db
    .select({ mealId: mealFavorites.mealId })
    .from(mealFavorites)
    .where(eq(mealFavorites.userId, userId))
  return new Set(rows.map((r) => r.mealId))
}

// Whitelist of columns a client may write on a meal. Prevents mass-assignment
// from a raw request body (id is server-owned).
const WRITABLE = [
  'name',
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'tags',
  'allowedSlots',
  'imageUrl',
  'description',
  'ingredients',
  'instructions',
  'timeMinutes',
  'difficulty',
  'servings',
] as const

const NULLABLE_NUMBERS = new Set([
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'timeMinutes',
  'servings',
])

export function pickMealFields(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of WRITABLE) {
    if (body[k] !== undefined)
      out[k] = body[k] === '' && NULLABLE_NUMBERS.has(k) ? null : body[k]
  }
  return out
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
  [k: string]: unknown
}) {
  const { ingredients: ingredientInput, ...mealValues } = values
  return db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values(mealValues).returning()
    await syncMealIngredients(tx, meal.id, ingredientInput ?? [])
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
