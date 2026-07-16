import { json, error } from '@sveltejs/kit'
import { requireOwnedPlan, validDateStr, addBonusItem } from '$lib/server/plans'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { date, name, calories, proteinG, carbsG, fatG } = await request.json()
  validDateStr(date)
  if (!name || typeof name !== 'string' || !name.trim())
    error(400, 'Name is required')

  const item = await addBonusItem(plan.id, date, {
    name: name.trim(),
    calories: calories ?? null,
    proteinG: proteinG ?? null,
    carbsG: carbsG ?? null,
    fatG: fatG ?? null,
  })
  return json(item, { status: 201 })
}
