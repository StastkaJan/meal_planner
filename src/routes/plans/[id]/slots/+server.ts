import { error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { findAllowedMeal } from '$lib/server/repositories/meals'
import {
  getSlotMeal,
  setSlotLeftover,
  upsertSlot,
} from '$lib/server/repositories/plans'
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
  const { date, mealType, source } = await request.json()
  validDateStr(date)
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')

  const slot = await getSlotMeal(plan.id, date, mealType)
  if (!slot?.mealId) error(404, 'Slot not found')

  if (source !== null) {
    if (!source || typeof source !== 'object') error(400, 'Invalid source')
    validDateStr(source.date)
    if (!(MEAL_TYPES as readonly string[]).includes(source.mealType))
      error(400, 'Invalid source mealType')
    if (source.date >= date)
      error(400, 'Leftovers must come from an earlier meal')
    const sourceSlot = await getSlotMeal(plan.id, source.date, source.mealType)
    if (!sourceSlot?.mealId || sourceSlot.mealId !== slot.mealId)
      error(400, 'Leftover source must contain the same meal')
  }

  await setSlotLeftover(plan.id, date, mealType, source)
  return new Response(null, { status: 204 })
}
