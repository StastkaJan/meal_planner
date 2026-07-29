import { error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/plans'
import { copyWeek } from '$lib/server/services/plans'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)

  const { from, to } = await request.json()
  const fromWeek = validDateStr(from)
  const toWeek = validDateStr(to)
  if (fromWeek === toWeek) error(400, 'Source and target week are the same')

  await copyWeek(plan.id, fromWeek, toWeek)
  return new Response(null, { status: 204 })
}
