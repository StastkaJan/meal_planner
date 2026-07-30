import { json } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/date'
import { recalculatePlanDay } from '$lib/server/services/plan-generation'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { date } = await request.json().catch(() => ({}))
  validDateStr(date)

  const filled = await recalculatePlanDay(plan, plan.userId, date)
  return json({ filled })
}
