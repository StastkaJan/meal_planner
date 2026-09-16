import { error } from '@sveltejs/kit'
import {
  createIngredientOption,
  saveManagedIngredient,
  mergeIngredients,
} from '../repositories/ingredients'
import { ingredientAdminInput } from '$lib/domain/ingredient-admin'
import { z } from 'zod'

export async function mergeCatalogueIngredients(body: unknown) {
  const id = z.number().int().positive().max(2147483647)
  const parsed = z.object({ sourceId: id, targetId: id }).safeParse(body)
  if (!parsed.success || parsed.data.sourceId === parsed.data.targetId)
    error(400, 'Select two different ingredients')
  const merged = await mergeIngredients(
    parsed.data.sourceId,
    parsed.data.targetId,
  )
  if (merged === false)
    error(409, 'An alias also belongs to another catalogue ingredient')
  if (!merged) error(404, 'Ingredient not found')
  return merged
}

export async function saveCatalogueIngredient(body: unknown, id?: number) {
  const parsed = ingredientAdminInput.safeParse(body)
  if (!parsed.success) error(400, 'Invalid ingredient translations or aliases')
  let saved
  try {
    saved = await saveManagedIngredient(parsed.data, id)
  } catch (cause) {
    const failure = cause as { code?: string; cause?: { code?: string } }
    if (failure.code === '23505' || failure.cause?.code === '23505')
      error(409, 'Ingredient name is already in use')
    throw cause
  }
  if (saved === false) error(409, 'Ingredient name is already in use')
  if (!saved) error(404, 'Ingredient not found')
  return saved
}

export function addIngredient(userId: number, body: unknown) {
  const name =
    body && typeof body === 'object' && 'name' in body ? body.name : null
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100)
    error(400, 'Ingredient name must contain 1–100 characters')
  return createIngredientOption(userId, name)
}
