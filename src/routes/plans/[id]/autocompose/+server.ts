import { json } from '@sveltejs/kit'
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
  const { week, favoritesOnly } = (await request.json().catch(() => ({}))) as {
    week?: string
    favoritesOnly?: boolean
  }

  const filled = await autocomposeSlots(
    plan,
    validDateStr(week ?? plan.weekStart),
    resolveTargets(await getUserSettings(plan.userId)),
    plan.userId,
    !!favoritesOnly,
  )
  return json({ filled })
}
