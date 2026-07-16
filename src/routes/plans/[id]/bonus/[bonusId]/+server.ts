import { requireOwnedPlan, deleteBonusItem } from '$lib/server/plans'
import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  await deleteBonusItem(plan.id, Number(params.bonusId))
  return new Response(null, { status: 204 })
}
