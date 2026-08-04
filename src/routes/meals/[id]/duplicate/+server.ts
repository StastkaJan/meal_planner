import { error, json } from '@sveltejs/kit'
import { requireVisibleMeal } from '$lib/server/guards'
import { duplicateGlobalMeal } from '$lib/server/services/meals'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  const { user } = await requireVisibleMeal(locals, id)
  const meal = await duplicateGlobalMeal(user.id, id)
  if (!meal) error(400, 'Only global meals can be duplicated')
  return json(meal, { status: 201 })
}
