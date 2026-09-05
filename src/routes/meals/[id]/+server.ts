import { json, error } from '@sveltejs/kit'
import { requireEditableMeal } from '$lib/server/guards'
import { archiveMeal } from '$lib/server/repositories/meals'
import { updateUserMeal } from '$lib/server/services/meals'
import { deleteMealImage } from '$lib/server/meal-images'
import { InvalidMealInputError } from '$lib/domain/meal-input'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  const body = await request.json().catch(() => error(400, 'Invalid JSON'))
  if (!body || typeof body !== 'object' || Array.isArray(body))
    error(400, 'Invalid JSON')
  let updated
  try {
    updated = await updateUserMeal(id, body)
  } catch (cause) {
    if (cause instanceof InvalidMealInputError) error(400, cause.message)
    throw cause
  }
  if (!updated) error(404, 'Meal not found')
  return json(updated)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  const deleted = await archiveMeal(id)
  if (!deleted) error(404, 'Meal not found')
  await deleteMealImage(id)
  return new Response(null, { status: 204 })
}
