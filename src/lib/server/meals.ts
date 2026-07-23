import { error } from '@sveltejs/kit'
import { and, or, isNull, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals, mealFavorites, ingredients, mealIngredients } from '$lib/schema'

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

export async function assertCanEdit(id: number, userId: number) {
  const [meal] = await db
    .select({ userId: meals.userId, archivedAt: meals.archivedAt })
    .from(meals)
    .where(eq(meals.id, id))
    .limit(1)
  if (!meal) error(404, 'Meal not found')
  if (!canAccessMeal(meal, userId)) error(403, 'Not allowed')
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

export function pickMealFields(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

// ---- structured ingredient links (backs the shopping list's quantity summing) ----

// Splits a leading quantity off a free-text ingredient line ("2 carrots" -> {qty: 2, name:
// "carrots"}). Only handles integers, decimals, and simple fractions (n/d) — no units, no
// mixed numbers; lines without a leading number (e.g. "salt and pepper") get qty: null.
export function parseIngredientLine(raw: string): {
  qty: number | null
  name: string
} {
  const match = raw.match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/)
  if (!match) return { qty: null, name: raw }
  const [, qtyStr, rest] = match
  const qty = qtyStr.includes('/')
    ? Number(qtyStr.split('/')[0]) / Number(qtyStr.split('/')[1])
    : Number(qtyStr)
  return { qty, name: rest }
}

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

// Replaces a meal's structured ingredient links from its free-text ingredient lines. Call
// this whenever meals.ingredients is written so mealIngredients stays in sync — the shopping
// list sums the qty column here instead of re-parsing free text on every read.
export async function syncMealIngredients(
  tx: Tx,
  mealId: number,
  lines: string[],
) {
  await tx.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId))
  const parsed = lines
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, ...parseIngredientLine(raw) }))
  if (!parsed.length) return

  const displayName = (name: string) => name[0].toUpperCase() + name.slice(1)
  const names = [...new Set(parsed.map((p) => displayName(p.name)))]
  const idByName = await findOrCreateIngredientIds(tx, names)

  await tx.insert(mealIngredients).values(
    parsed.map((p, position) => ({
      mealId,
      ingredientId: idByName.get(displayName(p.name))!,
      position,
      qty: p.qty !== null ? String(p.qty) : null,
      raw: p.raw,
    })),
  )
}

// Single choke point for meal creation: insert + structured-ingredient sync, one transaction.
export async function createMeal(values: {
  name: string
  [k: string]: unknown
}) {
  return db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values(values).returning()
    await syncMealIngredients(tx, meal.id, meal.ingredients)
    return meal
  })
}

// Single choke point for meal updates: update + structured-ingredient resync (only when
// ingredients was part of this write), one transaction.
export async function updateMeal(id: number, values: Record<string, unknown>) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(meals)
      .set(values)
      .where(eq(meals.id, id))
      .returning()
    if (!updated) return updated
    if (values.ingredients !== undefined) {
      await syncMealIngredients(tx, id, updated.ingredients)
    }
    return updated
  })
}

// ---- schema.org Recipe (JSON-LD) import ----------------------------------

export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  instructions?: string
  calories?: number
  timeMinutes?: number
}

// Find the Recipe node among parsed JSON-LD documents (handles arrays and @graph containers).
export function findRecipeNode(docs: unknown[]): Record<string, any> | null {
  const nodes: any[] = []
  for (const d of docs) {
    if (!d) continue
    if (Array.isArray(d)) nodes.push(...d)
    else {
      nodes.push(d)
      const graph = (d as any)['@graph']
      if (Array.isArray(graph)) nodes.push(...graph)
    }
  }
  return (
    nodes.find((n) => {
      const t = n?.['@type']
      return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
    }) ?? null
  )
}

// ISO-8601 duration (e.g. "PT1H30M", "P1DT2H") → minutes. Seconds are ignored.
export function isoDurationToMinutes(iso: unknown): number | undefined {
  if (typeof iso !== 'string') return undefined
  const m = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

// recipeInstructions can be a string, an array of strings/HowToStep, or nested HowToSections.
function flattenSteps(instr: unknown): string[] {
  if (typeof instr === 'string') return [instr]
  if (Array.isArray(instr)) return instr.flatMap(flattenSteps)
  if (instr && typeof instr === 'object') {
    const o = instr as Record<string, unknown>
    if (Array.isArray(o.itemListElement)) return flattenSteps(o.itemListElement)
    if (typeof o.text === 'string') return [o.text]
  }
  return []
}

export function parseRecipeJsonLd(recipe: Record<string, any>): ImportedRecipe {
  const out: ImportedRecipe = {}
  if (typeof recipe.name === 'string') out.name = recipe.name.trim()
  if (typeof recipe.description === 'string')
    out.description = recipe.description.trim()

  const img = recipe.image
  const imgUrl =
    typeof img === 'string'
      ? img
      : Array.isArray(img)
        ? typeof img[0] === 'string'
          ? img[0]
          : img[0]?.url
        : img?.url
  if (typeof imgUrl === 'string') out.imageUrl = imgUrl

  if (Array.isArray(recipe.recipeIngredient)) {
    out.ingredients = recipe.recipeIngredient
      .map(String)
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  const steps = flattenSteps(recipe.recipeInstructions)
    .map((s) => s.trim())
    .filter(Boolean)
  if (steps.length) out.instructions = steps.join('\n')

  const cal = recipe.nutrition?.calories
  const calNum =
    typeof cal === 'string'
      ? parseInt(cal, 10)
      : typeof cal === 'number'
        ? cal
        : NaN
  if (Number.isFinite(calNum)) out.calories = calNum

  const mins =
    isoDurationToMinutes(recipe.totalTime) ??
    isoDurationToMinutes(recipe.cookTime)
  if (mins) out.timeMinutes = mins

  return out
}
