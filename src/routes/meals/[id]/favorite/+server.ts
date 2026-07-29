import { requireEditableMeal } from '$lib/server/guards'
import { setMealFavorite } from '$lib/server/services/meals'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const mealId = Number(params.id)
  const { user } = await requireEditableMeal(locals, mealId)
  const { favorite } = await request.json()

  await setMealFavorite(user.id, mealId, !!favorite)
  return new Response(null, { status: 204 })
}
