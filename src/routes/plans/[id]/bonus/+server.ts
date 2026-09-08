import { json } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { addBonusItem } from '$lib/server/repositories/plans'
import { parseExtra } from '$lib/server/services/extras'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const body = await request.json().catch(() => ({}))
  validDateStr(body.date)
  const item = await addBonusItem(plan.id, body.date, parseExtra(body))
  return json(item, { status: 201 })
}
