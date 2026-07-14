import { error } from '@sveltejs/kit'
import {
  requireOwnedPlan,
  validDateStr,
  getUserSettings,
  autocomposeSlots,
} from '$lib/server/plans'
import { resolveTargets } from '$lib/constants'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  if (plan.mode !== 'simple')
    error(400, 'Auto-compose is only available for simple-mode plans')
  const { week } = (await request.json().catch(() => ({}))) as { week?: string }

  await autocomposeSlots(
    plan,
    validDateStr(week ?? plan.weekStart),
    resolveTargets(await getUserSettings(plan.userId)),
    plan.userId,
  )
  return new Response(null, { status: 204 })
}
