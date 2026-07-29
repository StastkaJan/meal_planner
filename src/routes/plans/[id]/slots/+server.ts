import { error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { upsertSlot, validDateStr } from '$lib/server/plans'
import { findAllowedMeal } from '$lib/server/services/meals'
import { MEAL_TYPES, mealFitsSlot } from '$lib/constants'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)

  const { date, mealType, mealId } = await request.json()
  validDateStr(date)
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')

  if (mealId != null) {
    const m = await findAllowedMeal(mealId, plan.userId)
    if (!m) error(404, 'Meal not found')
    if (!mealFitsSlot(m.allowedSlots, mealType))
      error(400, 'Meal not allowed for this slot type')
  }

  await upsertSlot(plan.id, date, mealType, mealId)
  return new Response(null, { status: 204 })
}
