import { json, error } from '@sveltejs/kit'
import { createUserMeal, listMeals } from '$lib/server/services/meals'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  return json(await listMeals(locals.user?.id))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const body = await request.json()
  if (!body.name) error(400, 'Name is required')
  // ownership is server-set (never from the whitelist): scope=personal → mine, else global
  const meal = await createUserMeal(locals.user.id, body)
  return json(meal, { status: 201 })
}
