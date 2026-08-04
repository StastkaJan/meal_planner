import { json } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { executePlanPopulation } from '$lib/server/services/plan-generation'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { week, favoritesOnly } = (await request.json().catch(() => ({}))) as {
    week?: string
    favoritesOnly?: boolean
  }

  const filled = await executePlanPopulation(
    {
      type: 'populate-plan',
      planId: plan.id,
      userId: plan.userId,
      week: validDateStr(week ?? plan.weekStart),
      favoritesOnly: !!favoritesOnly,
    },
    plan,
  )
  return json({ filled })
}
