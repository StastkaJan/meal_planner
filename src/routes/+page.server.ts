import { validDateStr } from '$lib/server/services/date'
import { getPlanDetail, listPlans } from '$lib/server/repositories/plans'
import { listMealPickerItems } from '$lib/server/repositories/meals'
import { getSettings } from '$lib/server/repositories/accounts'
import { resolveTargets } from '$lib/domain/nutrition'
import { addDays, mondayOf } from '$lib/utils/date-time'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user!.id
  const [plans, u] = await Promise.all([listPlans(userId), getSettings(userId)])
  const targets = resolveTargets(u)
  const preferences = {
    cuisinePrefs: u?.cuisinePrefs ?? [],
    dietaryRestrictions: u?.dietaryRestrictions ?? [],
  }

  const requestedId = Number(url.searchParams.get('plan'))
  const activePlan = plans.find((p) => p.id === requestedId) ?? plans.at(-1)

  if (!activePlan) {
    return {
      plans,
      picker: null,
      plan: null,
      activePlanId: 0,
      viewWeek: '',
      targets,
      preferences,
    }
  }

  const viewWeek = validDateStr(
    url.searchParams.get('week') ??
      mondayOf(new Date().toISOString().slice(0, 10)),
  )
  const plan = await getPlanDetail(activePlan, viewWeek, locals.locale)
  const pickDate = url.searchParams.get('pickDate') ?? ''
  const mealType = url.searchParams.get('pickSlot') ?? ''
  let picker = null
  if (pickDate && plan.mealSlots.includes(mealType)) {
    const date = validDateStr(pickDate)
    if (date >= viewWeek && date < addDays(viewWeek, 7)) {
      const rawPage = Number(url.searchParams.get('pickPage'))
      const page = Number.isFinite(rawPage)
        ? Math.max(1, Math.min(10000, Math.floor(rawPage)))
        : 1
      const query = (url.searchParams.get('pickQuery') ?? '')
        .trim()
        .slice(0, 200)
      const mine = url.searchParams.get('pickMine') === '1'
      const meals = await listMealPickerItems(userId, locals.locale, {
        mealType,
        query,
        mine,
        page,
      })
      picker = {
        date,
        mealType,
        query,
        mine,
        page,
        meals: meals.slice(0, 30),
        hasMore: meals.length > 30,
      }
    }
  }

  return {
    plans,
    picker,
    plan,
    activePlanId: activePlan.id,
    viewWeek,
    targets,
    preferences,
  }
}
