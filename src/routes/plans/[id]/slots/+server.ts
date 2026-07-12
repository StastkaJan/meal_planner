import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { ownedPlan, validWeek, upsertSlot } from '$lib/server/plans'
import { visibleToUser } from '$lib/server/meals'
import { MEAL_TYPES } from '$lib/types'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const planId = Number(params.id)
  const plan = await ownedPlan(planId, locals.user!.id)

  const { week, dayOfWeek, mealType, mealId } = await request.json()
  validWeek(week)
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    error(400, 'Invalid dayOfWeek')
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')

  if (mealId != null) {
    const [m] = await db
      .select({ id: meals.id })
      .from(meals)
      .where(and(eq(meals.id, mealId), visibleToUser(plan.userId)))
      .limit(1)
    if (!m) error(404, 'Meal not found')
  }

  await upsertSlot(plan.id, week, dayOfWeek, mealType, mealId)
  return new Response(null, { status: 204 })
}
