import { error } from '@sveltejs/kit'
import { createIngredientOption } from '../repositories/ingredients'

export function addIngredient(userId: number, body: unknown) {
  const name =
    body && typeof body === 'object' && 'name' in body ? body.name : null
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100)
    error(400, 'Ingredient name must contain 1–100 characters')
  return createIngredientOption(userId, name)
}
