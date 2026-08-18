import { error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { findAllowedMeal } from '$lib/server/repositories/meals'
import { updateSlotFeedback, upsertSlot } from '$lib/server/repositories/plans'
import { MEAL_TYPES } from '$lib/constants'
import { mealFitsSlot } from '$lib/domain/meals'
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

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { date, mealType, outcome, rating = null } = await request.json()
  validDateStr(date)
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')
  if (outcome !== null && outcome !== 'cooked' && outcome !== 'skipped')
    error(400, 'Outcome must be cooked, skipped, or null')
  if (
    rating !== null &&
    (!Number.isSafeInteger(rating) || rating < 1 || rating > 5)
  )
    error(400, 'Rating must be a whole number from 1 to 5')
  if (rating !== null && outcome !== 'cooked')
    error(400, 'Only cooked meals can be rated')

  const slot = await updateSlotFeedback(
    plan.id,
    date,
    mealType,
    outcome,
    rating,
  )
  if (!slot) error(404, 'Meal slot not found')
  return new Response(null, { status: 204 })
}
