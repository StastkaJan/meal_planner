import { error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { setSlotRepeat } from '$lib/server/repositories/plans'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)

  const { mealType, groupBreaks } = await request.json()
  if (!plan.mealSlots.includes(mealType)) error(400, 'Invalid mealType')
  if (
    groupBreaks !== null &&
    (!Array.isArray(groupBreaks) ||
      groupBreaks.length !== 6 ||
      groupBreaks.some((b) => typeof b !== 'boolean'))
  )
    error(400, 'Invalid groupBreaks')

  await setSlotRepeat(plan.id, mealType, groupBreaks)
  return new Response(null, { status: 204 })
}
