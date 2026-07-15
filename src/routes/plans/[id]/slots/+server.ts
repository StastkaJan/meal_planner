import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { requireOwnedPlan, validDateStr, upsertSlot } from '$lib/server/plans'
import { visibleToUser } from '$lib/server/meals'
import { MEAL_TYPES, mealFitsSlot } from '$lib/constants'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)

  const { date, mealType, mealId } = await request.json()
  validDateStr(date)
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')

  if (mealId != null) {
    const [m] = await db
      .select({ id: meals.id, allowedSlots: meals.allowedSlots })
      .from(meals)
      .where(and(eq(meals.id, mealId), visibleToUser(plan.userId)))
      .limit(1)
    if (!m) error(404, 'Meal not found')
    if (!mealFitsSlot(m.allowedSlots, mealType))
      error(400, 'Meal not allowed for this slot type')
  }

  await upsertSlot(plan.id, date, mealType, mealId)
  return new Response(null, { status: 204 })
}
