import { error } from '@sveltejs/kit'
import { and, or, isNull, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals } from '$lib/schema'

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

// ---- schema.org Recipe (JSON-LD) import ----------------------------------

export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  instructions?: string
  calories?: number
  timeMinutes?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  servings?: number
  tags?: string[]
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

// ---- Edamam Recipe Search v2 import --------------------------------------

// Maps a `hits[].recipe` object from the Edamam Recipe Search API v2 response. Edamam's
// calories/nutrients/yield are whole-recipe totals, matching how this app already stores
// and rescales macros by a servings stepper — no per-serving division needed.
export function parseEdamamRecipe(recipe: Record<string, any>): ImportedRecipe {
  const out: ImportedRecipe = {}
  if (typeof recipe.label === 'string') out.name = recipe.label.trim()
  if (typeof recipe.image === 'string') out.imageUrl = recipe.image

  if (Array.isArray(recipe.ingredientLines)) {
    out.ingredients = recipe.ingredientLines
      .map(String)
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  if (Number.isFinite(recipe.calories))
    out.calories = Math.round(recipe.calories)
  if (Number.isFinite(recipe.totalTime) && recipe.totalTime > 0)
    out.timeMinutes = Math.round(recipe.totalTime)
  if (Number.isFinite(recipe.yield) && recipe.yield > 0)
    out.servings = Math.round(recipe.yield)

  const protein = recipe.totalNutrients?.PROCNT?.quantity
  if (Number.isFinite(protein)) out.proteinG = Math.round(protein)
  const carbs = recipe.totalNutrients?.CHOCDF?.quantity
  if (Number.isFinite(carbs)) out.carbsG = Math.round(carbs)
  const fat = recipe.totalNutrients?.FAT?.quantity
  if (Number.isFinite(fat)) out.fatG = Math.round(fat)

  const tags = [
    ...(Array.isArray(recipe.dietLabels) ? recipe.dietLabels : []),
    ...(Array.isArray(recipe.cuisineType) ? recipe.cuisineType : []),
    ...(Array.isArray(recipe.mealType) ? recipe.mealType : []),
  ]
    .map(String)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (tags.length) out.tags = [...new Set(tags)]

  return out
}
