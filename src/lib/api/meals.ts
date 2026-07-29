import type { Meal } from '$lib/schema'
import { jsonBody, request, requestJson } from './http'

export const createMeal = (body: object) =>
  requestJson<Meal>('/meals', { method: 'POST', body: jsonBody(body) })

export const updateMeal = (id: number, body: object) =>
  request(`/meals/${id}`, { method: 'PATCH', body: jsonBody(body) })

export const deleteMeal = (id: number) =>
  request(`/meals/${id}`, { method: 'DELETE' })

export const setFavorite = (id: number, favorite: boolean) =>
  request(`/meals/${id}/favorite`, {
    method: 'PUT',
    body: jsonBody({ favorite }),
  })

export const importRecipe = (url: string) =>
  requestJson<Record<string, unknown>>('/meals/import', {
    method: 'POST',
    body: jsonBody({ url }),
  })
