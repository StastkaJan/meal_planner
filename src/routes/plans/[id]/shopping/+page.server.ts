import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { getShoppingList } from '$lib/server/repositories/plans'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)

  return {
    planId: plan.id,
    portions: plan.portions,
    week,
    items: await getShoppingList(plan.id, week),
  }
}
