import { json, error } from '@sveltejs/kit'
import { requireEditableMeal } from '$lib/server/guards'
import { archiveMeal, updateUserMeal } from '$lib/server/services/meals'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  const updated = await updateUserMeal(id, await request.json())
  if (!updated) error(404, 'Meal not found')
  return json(updated)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await requireEditableMeal(locals, id)
  const deleted = await archiveMeal(id)
  if (!deleted) error(404, 'Meal not found')
  return new Response(null, { status: 204 })
}
