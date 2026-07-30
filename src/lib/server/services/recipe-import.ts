import { isoDurationToMinutes } from '$lib/utils/date-time'
import type { ImportedRecipe } from '$lib/types'

export function findRecipeNode(
  documents: unknown[],
): Record<string, any> | null {
  const nodes: any[] = []
  for (const document of documents) {
    if (!document) continue
    if (Array.isArray(document)) nodes.push(...document)
    else {
      nodes.push(document)
      const graph = (document as any)['@graph']
      if (Array.isArray(graph)) nodes.push(...graph)
    }
  }
  return (
    nodes.find((node) => {
      const type = node?.['@type']
      return (
        type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
      )
    }) ?? null
  )
}

function flattenSteps(instructions: unknown): string[] {
  if (typeof instructions === 'string') return [instructions]
  if (Array.isArray(instructions)) return instructions.flatMap(flattenSteps)
  if (instructions && typeof instructions === 'object') {
    const value = instructions as Record<string, unknown>
    if (Array.isArray(value.itemListElement))
      return flattenSteps(value.itemListElement)
    if (typeof value.text === 'string') return [value.text]
  }
  return []
}

export function parseRecipeJsonLd(recipe: Record<string, any>): ImportedRecipe {
  const result: ImportedRecipe = {}
  if (typeof recipe.name === 'string') result.name = recipe.name.trim()
  if (typeof recipe.description === 'string')
    result.description = recipe.description.trim()

  const image = recipe.image
  const imageUrl =
    typeof image === 'string'
      ? image
      : Array.isArray(image)
        ? typeof image[0] === 'string'
          ? image[0]
          : image[0]?.url
        : image?.url
  if (typeof imageUrl === 'string') result.imageUrl = imageUrl

  if (Array.isArray(recipe.recipeIngredient)) {
    result.ingredients = recipe.recipeIngredient
      .map(String)
      .map((value: string) => value.trim())
      .filter(Boolean)
  }

  const steps = flattenSteps(recipe.recipeInstructions)
    .map((value) => value.trim())
    .filter(Boolean)
  if (steps.length) result.instructions = steps.join('\n')

  const calories = recipe.nutrition?.calories
  const calorieValue =
    typeof calories === 'string'
      ? parseInt(calories, 10)
      : typeof calories === 'number'
        ? calories
        : NaN
  if (Number.isFinite(calorieValue)) result.calories = calorieValue

  const minutes =
    isoDurationToMinutes(recipe.totalTime) ??
    isoDurationToMinutes(recipe.cookTime)
  if (minutes) result.timeMinutes = minutes

  return result
}
