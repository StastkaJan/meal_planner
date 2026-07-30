import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/date'
import {
  deletePlan,
  getPlanDetail,
  updatePlan,
} from '$lib/server/repositories/plans'

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)
  const result = await getPlanDetail(plan, week)
  return json(result)
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { name, cuisinePrefs, dietaryRestrictions } = await request.json()
  const updated = await updatePlan(plan.id, {
    name,
    cuisinePrefs,
    dietaryRestrictions,
  })
  return json(updated)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  await deletePlan(plan.id)
  return new Response(null, { status: 204 })
}
