import { validDateStr } from '$lib/server/date'
import { getPlanDetail, listPlans } from '$lib/server/repositories/plans'
import { listMeals } from '$lib/server/repositories/meals'
import { getSettings } from '$lib/server/repositories/accounts'
import { resolveTargets } from '$lib/constants'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user!.id
  const [plans, meals, u] = await Promise.all([
    listPlans(userId),
    listMeals(userId),
    getSettings(userId),
  ])
  const targets = resolveTargets(u)

  const requestedId = Number(url.searchParams.get('plan'))
  const activePlan = plans.find((p) => p.id === requestedId) ?? plans.at(-1)

  if (!activePlan) {
    return { plans, meals, plan: null, activePlanId: 0, viewWeek: '', targets }
  }

  const viewWeek = validDateStr(
    url.searchParams.get('week') || activePlan.weekStart,
  )
  const plan = await getPlanDetail(activePlan, viewWeek)

  return { plans, meals, plan, activePlanId: activePlan.id, viewWeek, targets }
}
