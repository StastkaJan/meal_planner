import {
  ownedPlan,
  validWeek,
  getUserSettings,
  autocomposeSlots,
} from '$lib/server/plans'
import { resolveTargets } from '$lib/types'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const planId = Number(params.id)
  const plan = await ownedPlan(planId, locals.user!.id)
  const { week } = (await request.json().catch(() => ({}))) as { week?: string }

  await autocomposeSlots(
    plan,
    validWeek(week ?? plan.weekStart),
    resolveTargets(await getUserSettings(plan.userId)),
    plan.userId,
  )
  return new Response(null, { status: 204 })
}
