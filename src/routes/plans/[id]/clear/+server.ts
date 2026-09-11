import { error } from '@sveltejs/kit'
import { z } from 'zod'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { addDays } from '$lib/utils/date-time'
import { clearPlan } from '$lib/server/repositories/plans'
import type { RequestHandler } from './$types'

const input = z.union([
  z.object({ date: z.string() }).strict(),
  z.object({ week: z.string() }).strict(),
])

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) error(400, 'Invalid request')
  const scope = parsed.data
  const start = validDateStr('date' in scope ? scope.date : scope.week)
  await clearPlan(plan.id, start, addDays(start, 'date' in scope ? 1 : 7))
  return new Response(null, { status: 204 })
}
