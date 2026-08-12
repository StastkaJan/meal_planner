import { createHash } from 'node:crypto'
import type { ImportedRecipe } from '$lib/types'
import type { CatalogueRecipe } from '$lib/database/schema'
import { pickMealFields } from './meals'
import {
  queueRecipeImports,
  type QueuedRecipe,
} from '../repositories/recipe-imports'

const MAX_BATCH_SIZE = 300

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function validateCatalogueRecipe(candidate: unknown) {
  const errors: string[] = []
  if (!candidate || typeof candidate !== 'object') {
    errors.push('recipe')
    return { errors }
  }

  const recipe = pickMealFields(candidate as Record<string, unknown>)
  if (typeof recipe.name !== 'string' || !recipe.name.trim())
    errors.push('name')
  if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length)
    errors.push('ingredients')
  else if (
    recipe.ingredients.some(
      (ingredient) =>
        !ingredient ||
        typeof ingredient !== 'object' ||
        typeof (ingredient as Record<string, unknown>).name !== 'string' ||
        !(ingredient as Record<string, unknown>).name,
    )
  )
    errors.push('ingredients')
  if (typeof recipe.instructions !== 'string' || !recipe.instructions.trim())
    errors.push('instructions')
  if (errors.length) return { errors }

  recipe.name = (recipe.name as string).trim()
  return {
    errors,
    value: {
      recipe: recipe as ImportedRecipe & CatalogueRecipe,
      contentHash: createHash('sha256')
        .update(canonicalJson(recipe))
        .digest('hex'),
    },
  }
}

export async function importCatalogueBatch(userId: number, body: unknown) {
  const candidates = Array.isArray(body) ? body : []
  if (!candidates.length || candidates.length > MAX_BATCH_SIZE)
    return { batchError: 'Provide between 1 and 300 recipes' }

  const errors: { index: number; fields: string[] }[] = []
  const seenHashes = new Set<string>()
  let duplicates = 0
  const values: QueuedRecipe[] = []

  candidates.forEach((candidate, index) => {
    const result = validateCatalogueRecipe(candidate)
    if (!result.value) {
      errors.push({ index, fields: result.errors })
      return
    }
    if (seenHashes.has(result.value.contentHash)) {
      duplicates++
      return
    }
    seenHashes.add(result.value.contentHash)
    values.push({ ...result.value, submittedBy: userId })
  })

  const inserted = await queueRecipeImports(values)
  duplicates += values.length - inserted.length
  return { accepted: inserted.length, duplicates, errors }
}
