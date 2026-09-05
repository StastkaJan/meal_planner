import { json, error } from '@sveltejs/kit'
import { createUserMeal } from '$lib/server/services/meals'
import { listMeals } from '$lib/server/repositories/meals'
import { InvalidMealInputError } from '$lib/domain/meal-input'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  return json(await listMeals(locals.user?.id, locals.locale))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const body = await request.json().catch(() => error(400, 'Invalid JSON'))
  if (!body || typeof body !== 'object' || Array.isArray(body))
    error(400, 'Invalid JSON')
  if (body.scope === 'global' && !locals.user.isAdmin)
    error(403, 'Only admins can create global recipes')
  if (body.scope && !['personal', 'global'].includes(body.scope))
    error(400, 'Invalid scope')
  let meal
  try {
    meal = await createUserMeal(locals.user.id, body, locals.locale)
  } catch (cause) {
    if (cause instanceof InvalidMealInputError) error(400, cause.message)
    throw cause
  }
  return json(meal, { status: 201 })
}
