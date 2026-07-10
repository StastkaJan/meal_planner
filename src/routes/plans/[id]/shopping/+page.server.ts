import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { weekSlots, meals } from '$lib/schema'
import { ownedPlan, validWeek, mergeIngredients } from '$lib/server/plans'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const plan = await ownedPlan(Number(params.id), locals.user!.id)
  const week = validWeek(url.searchParams.get('week') ?? plan.weekStart)

  const rows = await db
    .select({ ingredients: meals.ingredients })
    .from(weekSlots)
    .innerJoin(meals, eq(weekSlots.mealId, meals.id))
    .where(and(eq(weekSlots.planId, plan.id), eq(weekSlots.week, week)))

  return {
    planId: plan.id,
    planName: plan.name,
    week,
    items: mergeIngredients(rows.map((r) => r.ingredients)),
  }
}
