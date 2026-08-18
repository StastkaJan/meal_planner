import { requireOwnedPlan } from '$lib/server/guards'
import { deleteCustomShoppingItem } from '$lib/server/repositories/plans'
import { validDateStr } from '$lib/server/services/date'
import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? '')
  await deleteCustomShoppingItem(plan.id, week, params.key)
  return new Response(null, { status: 204 })
}
