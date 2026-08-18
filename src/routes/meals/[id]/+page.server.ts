import { error } from '@sveltejs/kit'
import { findMeal, getMealIngredients } from '$lib/server/repositories/meals'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const mealId = Number(params.id)
  const meal = await findMeal(mealId, locals.user?.id)
  // hide another user's personal meal — indistinguishable from "not found"
  if (!meal) error(404, 'Meal not found')

  const ingredients = await getMealIngredients(mealId)
  return {
    meal,
    ingredients,
    editable: meal.canEdit || (!meal.userId && locals.user?.isAdmin),
  }
}
