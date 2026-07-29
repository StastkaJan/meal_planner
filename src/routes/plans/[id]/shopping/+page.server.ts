import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/plans'
import { getShoppingList } from '$lib/server/services/plans'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)

  return {
    planId: plan.id,
    planName: plan.name,
    week,
    items: await getShoppingList(plan.id, week),
  }
}
