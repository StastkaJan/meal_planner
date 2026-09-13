import { error } from '@sveltejs/kit'
import {
  createIngredientOption,
  saveManagedIngredient,
} from '../repositories/ingredients'
import { ingredientAdminInput } from '$lib/domain/ingredient-admin'

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
