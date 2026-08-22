import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import {
  deletePlan,
  getPlanDetail,
  updatePlanMealSlots,
  updatePlanPortions,
} from '$lib/server/repositories/plans'
import { parseMealSlots } from '$lib/domain/meal-slots'

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)
  const result = await getPlanDetail(plan, week)
  return json(result)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  await deletePlan(plan.id)
  return new Response(null, { status: 204 })
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { portions, mealSlots: requestedMealSlots } = await request.json()
  if (requestedMealSlots !== undefined) {
    const mealSlots = parseMealSlots(requestedMealSlots)
    if (!mealSlots) error(400, 'Choose between 1 and 10 valid meal slots')
    return json(await updatePlanMealSlots(plan.id, mealSlots))
  }
  if (!Number.isSafeInteger(portions) || portions < 1 || portions > 100)
    error(400, 'Portions must be a whole number from 1 to 100')
  return json(await updatePlanPortions(plan.id, portions))
}
