import { json, error } from '@sveltejs/kit'
import { createUserMeal } from '$lib/server/services/meals'
import { listMeals } from '$lib/server/repositories/meals'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  return json(await listMeals(locals.user?.id))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const body = await request.json()
  if (!body.name) error(400, 'Name is required')
  if (body.scope === 'global' && !locals.user.isAdmin)
    error(403, 'Only admins can create global recipes')
  if (body.scope && !['personal', 'global'].includes(body.scope))
    error(400, 'Invalid scope')
  const meal = await createUserMeal(locals.user.id, body)
  return json(meal, { status: 201 })
}
