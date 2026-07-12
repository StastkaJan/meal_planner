import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { weekSlots, meals } from '$lib/schema'
import {
  requireOwnedPlan,
  validDateStr,
  mergeIngredients,
  inWeek,
} from '$lib/server/plans'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)

  const rows = await db
    .select({ ingredients: meals.ingredients })
    .from(weekSlots)
    .innerJoin(meals, eq(weekSlots.mealId, meals.id))
    .where(inWeek(plan.id, week))

  return {
    planId: plan.id,
    planName: plan.name,
    week,
    items: mergeIngredients(rows.map((r) => r.ingredients)),
  }
}
