import { error } from '@sveltejs/kit'
import { requireOwnedPlan, deleteBonusItem } from '$lib/server/plans'
import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const bonusId = Number(params.bonusId)
  if (!Number.isFinite(bonusId)) error(400, 'Invalid bonus item id')
  await deleteBonusItem(plan.id, bonusId)
  return new Response(null, { status: 204 })
}
