import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { weekSlots, meals, mealIngredients, ingredients } from '$lib/schema'
import {
  requireOwnedPlan,
  validDateStr,
  sumIngredients,
  inWeek,
} from '$lib/server/plans'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const week = validDateStr(url.searchParams.get('week') ?? plan.weekStart)

  const rows = await db
    .select({ name: ingredients.name, qty: mealIngredients.qty })
    .from(weekSlots)
    .innerJoin(meals, eq(weekSlots.mealId, meals.id))
    .innerJoin(mealIngredients, eq(mealIngredients.mealId, meals.id))
    .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(inWeek(plan.id, week))

  return {
    planId: plan.id,
    planName: plan.name,
    week,
    items: sumIngredients(rows),
  }
}
