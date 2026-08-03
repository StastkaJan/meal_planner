import { error, json } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { createUserPlan } from '$lib/server/services/plans'
import { listPlans } from '$lib/server/repositories/plans'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const { id } = requireUser(locals)
  return json(await listPlans(id))
}

export const POST: RequestHandler = async ({ locals }) => {
  const { id: userId } = requireUser(locals)
  if ((await listPlans(userId)).length) error(409, 'Plan already exists')
  const plan = await createUserPlan(userId)
  return json(plan, { status: 201 })
}
