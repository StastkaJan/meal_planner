import { json, error } from '@sveltejs/kit'
import { requireOwnedPlan, validDateStr, addBonusItem } from '$lib/server/plans'
import type { RequestHandler } from './$types'

// non-finite (NaN/Infinity/non-numeric string) coerces to null rather than erroring,
// matching the toTarget() convention in src/routes/profile/+server.ts
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { date, name, calories, proteinG, carbsG, fatG } = await request
    .json()
    .catch(() => ({}))
  validDateStr(date)
  if (!name || typeof name !== 'string' || !name.trim())
    error(400, 'Name is required')

  const item = await addBonusItem(plan.id, date, {
    name: name.trim(),
    calories: toNumOrNull(calories),
    proteinG: toNumOrNull(proteinG),
    carbsG: toNumOrNull(carbsG),
    fatG: toNumOrNull(fatG),
  })
  return json(item, { status: 201 })
}
