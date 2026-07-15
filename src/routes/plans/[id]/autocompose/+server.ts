import {
  requireOwnedPlan,
  validWeek,
  getUserSettings,
  autocomposeSlots,
} from '$lib/server/plans'
import { resolveTargets } from '$lib/constants'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { week } = (await request.json().catch(() => ({}))) as { week?: string }

  await autocomposeSlots(
    plan,
    validWeek(week ?? plan.weekStart),
    resolveTargets(await getUserSettings(plan.userId)),
    plan.userId,
  )
  return new Response(null, { status: 204 })
}
