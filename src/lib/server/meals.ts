import { and, or, isNull, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { meals, mealFavorites, ingredients, mealIngredients } from '../schema'
import type { IngredientInput } from '../types'

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

export function pickMealFields(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

// ---- structured ingredient links (source of truth for a meal's ingredients) ----

// Recognized unit words/synonyms an imported (free-text) ingredient line might use, mapped
// to the canonical UNIT_OPTIONS value.
const UNIT_SYNONYMS: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  piece: 'piece',
  pieces: 'piece',
  pcs: 'piece',
  clove: 'clove',
  cloves: 'clove',
  pinch: 'pinch',
  pinches: 'pinch',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
}

// Best-effort split of a free-text ingredient line (e.g. from recipe import) into qty/unit/
// name — "2 tbsp olive oil" -> {qty: 2, unit: 'tbsp', name: 'olive oil'}. Only recognizes a
// unit as the token immediately after the quantity; ponytail: "2 garlic cloves" (unit after
// the name) and "1 large apple" ("large" isn't a real unit) both fall through to the whole
// remainder as name — acceptable, user can fix up unit/qty in the edit form after import.
export function parseIngredientLine(raw: string): IngredientInput {
  const match = raw.match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(.+)$/)
  if (!match) return { qty: null, unit: null, name: raw }
  const [, qtyStr, rest] = match
  const qty = qtyStr.includes('/')
    ? Number(qtyStr.split('/')[0]) / Number(qtyStr.split('/')[1])
    : Number(qtyStr)
  const unitMatch = rest.match(/^([a-zA-Z]+)\s+(.+)$/)
  if (unitMatch) {
    const unit = UNIT_SYNONYMS[unitMatch[1].toLowerCase()]
    if (unit) return { qty, unit, name: unitMatch[2] }
  }
  return { qty, unit: null, name: rest }
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

// ---- schema.org Recipe (JSON-LD) import ----------------------------------

export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: IngredientInput[]
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
      .map(parseIngredientLine)
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
