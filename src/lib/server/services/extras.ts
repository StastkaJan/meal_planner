import { error } from '@sveltejs/kit'
import type { ExtraFields } from '$lib/domain/extras'

function toNumOrNull(v: unknown, max: number, integer = false): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'number' && typeof v !== 'string')
    error(400, 'Invalid nutrition value')
  if (typeof v === 'string' && !v.trim()) return null
  const n = Number(v)
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    error(400, 'Invalid nutrition value')
  return n
}

export function parseExtra(input: unknown): ExtraFields {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    error(400, 'Invalid extra')
  const body = input as Record<string, unknown>
  const {
    name,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sugarG,
    saturatedFatG,
    saltG,
  } = body
  if (typeof name !== 'string' || !name.trim()) error(400, 'Name is required')
  if (name.trim().length > 200) error(400, 'Name is too long')
  return {
    name: name.trim(),
    calories: toNumOrNull(calories, 2_147_483_647, true),
    proteinG: toNumOrNull(proteinG, 99_999.9),
    carbsG: toNumOrNull(carbsG, 99_999.9),
    fatG: toNumOrNull(fatG, 99_999.9),
    fiberG: toNumOrNull(fiberG, 99_999.99),
    sugarG: toNumOrNull(sugarG, 99_999.99),
    saturatedFatG: toNumOrNull(saturatedFatG, 99_999.99),
    saltG: toNumOrNull(saltG, 99_999.99),
  }
}
