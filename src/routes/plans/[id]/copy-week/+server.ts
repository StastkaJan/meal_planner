import { error } from '@sveltejs/kit'
import { ownedPlan, validWeek, copyWeek } from '$lib/server/plans'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const planId = Number(params.id)
  const plan = await ownedPlan(planId, locals.user!.id)

  const { from, to } = await request.json()
  const fromWeek = validWeek(from)
  const toWeek = validWeek(to)
  if (fromWeek === toWeek) error(400, 'Source and target week are the same')

  await copyWeek(plan.id, fromWeek, toWeek)
  return new Response(null, { status: 204 })
}
