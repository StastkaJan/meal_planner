import { json } from '@sveltejs/kit'
import {
  requireOwnedPlan,
  validDateStr,
  getUserSettings,
  recalcDaySlots,
} from '$lib/server/plans'
import { resolveTargets } from '$lib/constants'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { date } = await request.json().catch(() => ({}))
  validDateStr(date)

  // requireOwnedPlan only ever returns plans where plans.userId = the current user's id,
  // so this is never actually null despite the column being nullable in general.
  const ownerId = plan.userId!
  const filled = await recalcDaySlots(
    plan,
    date,
    resolveTargets(await getUserSettings(ownerId)),
    ownerId,
  )
  return json({ filled })
}
