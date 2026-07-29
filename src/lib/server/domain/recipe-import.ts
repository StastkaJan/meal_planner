export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  instructions?: string
  calories?: number
  timeMinutes?: number
}

export function findRecipeNode(docs: unknown[]): Record<string, any> | null {
  const nodes: any[] = []
  for (const document of docs) {
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

export function isoDurationToMinutes(iso: unknown): number | undefined {
  if (typeof iso !== 'string') return undefined
  const match = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined
  return (
    Number(match[1] ?? 0) * 1440 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
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
