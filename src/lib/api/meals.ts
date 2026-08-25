import type { Meal, MealTranslation } from '$lib/database/schema'
import type { Locale } from '$lib/i18n'
import type { ImportedRecipe } from '$lib/types'
import { jsonBody, request, requestJson } from './http'

export const createMeal = (body: object) =>
  requestJson<Meal>('/meals', { method: 'POST', body: jsonBody(body) })

export const updateMeal = (id: number, body: object) =>
  requestJson<Meal>(`/meals/${id}`, { method: 'PATCH', body: jsonBody(body) })

export const updateMealTranslation = (
  id: number,
  locale: Locale,
  body: object,
) =>
  requestJson<MealTranslation>(`/meals/${id}/translations/${locale}`, {
    method: 'PATCH',
    body: jsonBody(body),
  })

export const deleteMealTranslation = (id: number, locale: Locale) =>
  request(`/meals/${id}/translations/${locale}`, { method: 'DELETE' })

export const deleteMeal = (id: number) =>
  request(`/meals/${id}`, { method: 'DELETE' })

export const duplicateMeal = (id: number) =>
  requestJson<Meal>(`/meals/${id}/duplicate`, { method: 'POST' })

export const setFavorite = (id: number, favorite: boolean) =>
  request(`/meals/${id}/favorite`, {
    method: 'PUT',
    body: jsonBody({ favorite }),
  })

export const importRecipe = (url: string) =>
  requestJson<ImportedRecipe>('/meals/import', {
    method: 'POST',
    body: jsonBody({ url }),
  })
