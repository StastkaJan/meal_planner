import { error } from '@sveltejs/kit'
import { z } from 'zod'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { clearPlan } from '$lib/server/repositories/plans'
import type { RequestHandler } from './$types'

const input = z.object({ date: z.string().optional() }).strict()

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) error(400, 'Invalid request')
  const { date } = parsed.data
  if (date !== undefined) validDateStr(date)
  await clearPlan(plan.id, date)
  return new Response(null, { status: 204 })
}
