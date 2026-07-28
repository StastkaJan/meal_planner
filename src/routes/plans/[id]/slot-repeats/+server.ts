import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { slotRepeats } from '$lib/schema'
import { requireOwnedPlan } from '$lib/server/plans'
import { MEAL_TYPES } from '$lib/constants'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)

  const { mealType, groupBreaks } = await request.json()
  if (!(MEAL_TYPES as readonly string[]).includes(mealType))
    error(400, 'Invalid mealType')
  if (
    groupBreaks !== null &&
    (!Array.isArray(groupBreaks) ||
      groupBreaks.length !== 6 ||
      groupBreaks.some((b) => typeof b !== 'boolean'))
  )
    error(400, 'Invalid groupBreaks')

  if (groupBreaks === null) {
    await db
      .delete(slotRepeats)
      .where(
        and(
          eq(slotRepeats.planId, plan.id),
          eq(slotRepeats.mealType, mealType),
        ),
      )
  } else {
    await db
      .insert(slotRepeats)
      .values({ planId: plan.id, mealType, groupBreaks })
      .onConflictDoUpdate({
        target: [slotRepeats.planId, slotRepeats.mealType],
        set: { groupBreaks },
      })
  }
  return new Response(null, { status: 204 })
}
