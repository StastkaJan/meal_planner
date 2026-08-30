import { json, error } from '@sveltejs/kit'
import { requireOwnedPlan } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { addBonusItem } from '$lib/server/repositories/plans'
import type { RequestHandler } from './$types'

// non-finite (NaN/Infinity/non-numeric string) coerces to null rather than erroring,
// matching the toTarget() convention in src/routes/profile/+server.ts
function toNumOrNull(v: unknown, max: number, integer = false): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  if (n < 0 || n > max || (integer && !Number.isInteger(n)))
    error(400, 'Invalid nutrition value')
  return n
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const {
    date,
    name,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sugarG,
    saturatedFatG,
    saltG,
  } = await request.json().catch(() => ({}))
  validDateStr(date)
  if (!name || typeof name !== 'string' || !name.trim())
    error(400, 'Name is required')

  const item = await addBonusItem(plan.id, date, {
    name: name.trim(),
    calories: toNumOrNull(calories, 2_147_483_647, true),
    proteinG: toNumOrNull(proteinG, 99_999.9),
    carbsG: toNumOrNull(carbsG, 99_999.9),
    fatG: toNumOrNull(fatG, 99_999.9),
    fiberG: toNumOrNull(fiberG, 99_999.99),
    sugarG: toNumOrNull(sugarG, 99_999.99),
    saturatedFatG: toNumOrNull(saturatedFatG, 99_999.99),
    saltG: toNumOrNull(saltG, 99_999.99),
  })
  return json(item, { status: 201 })
}
