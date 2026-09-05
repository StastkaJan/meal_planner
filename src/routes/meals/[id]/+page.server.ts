import { error } from '@sveltejs/kit'
import {
  findMeal,
  getMealIngredients,
  getMealTranslations,
} from '$lib/server/repositories/meals'
import { hasMealImage } from '$lib/server/meal-images'
import { localizeMeal } from '$lib/server/services/meals'
import type { PageServerLoad } from './$types'

export const load = (async ({
  params,
  locals,
}: Pick<Parameters<PageServerLoad>[0], 'params' | 'locals'>) => {
  const mealId = Number(params.id)
  const meal = await findMeal(mealId, locals.user?.id)
  // hide another user's personal meal — indistinguishable from "not found"
  if (!meal) error(404, 'Meal not found')

  const [ingredients, translations, hasUploadedImage] = await Promise.all([
    getMealIngredients(mealId),
    getMealTranslations(mealId),
    hasMealImage(mealId),
  ])
  const translation = translations.find((item) => item.locale === locals.locale)
  return {
    meal: localizeMeal(meal, translation),
    sourceMeal: meal,
    translations,
    ingredients,
    hasUploadedImage,
    locale: locals.locale,
    editable:
      meal.userId === locals.user?.id || (!meal.userId && locals.user?.isAdmin),
  }
}) satisfies PageServerLoad
