import { error } from '@sveltejs/kit'
import {
  findMeal,
  getMealIngredients,
  getMealTranslations,
} from '$lib/server/repositories/meals'
import { localizeMeal } from '$lib/server/services/meals'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const mealId = Number(params.id)
  const meal = await findMeal(mealId, locals.user?.id)
  // hide another user's personal meal — indistinguishable from "not found"
  if (!meal) error(404, 'Meal not found')

  const [ingredients, translations] = await Promise.all([
    getMealIngredients(mealId),
    getMealTranslations(mealId),
  ])
  const translation = translations.find((item) => item.locale === locals.locale)
  return {
    meal: localizeMeal(meal, translation),
    sourceMeal: meal,
    translations,
    ingredients,
    locale: locals.locale,
    editable:
      meal.userId === locals.user?.id || (!meal.userId && locals.user?.isAdmin),
  }
}
