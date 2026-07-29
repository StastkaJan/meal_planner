import {
  archiveMeal,
  favoriteMealIds,
  findAllowedMeal,
  findMeal,
  getMealIngredients,
  listMeals,
  setMealFavorite,
} from '../repositories/meals'
import { createMeal, pickMealFields, updateMeal } from '../meals'

export {
  archiveMeal,
  favoriteMealIds,
  findAllowedMeal,
  findMeal,
  getMealIngredients,
  listMeals,
  setMealFavorite,
}

export async function createUserMeal(
  userId: number,
  body: Record<string, unknown>,
) {
  const values = pickMealFields(body)
  values.userId = body.scope === 'personal' ? userId : null
  return createMeal(values as { name: string })
}

export async function updateUserMeal(
  id: number,
  body: Record<string, unknown>,
) {
  return updateMeal(id, pickMealFields(body))
}
