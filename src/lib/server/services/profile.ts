import { hashPassword, verifyPassword } from '$lib/auth'
import {
  findUserById,
  getSettings,
  saveSettings,
  updatePassword,
} from '../repositories/accounts'

const TARGET_FIELDS = [
  'calorieTarget',
  'proteinTarget',
  'carbsTarget',
  'fatTarget',
] as const

function toTarget(value: unknown): number | null {
  const target = Math.round(Number(value))
  return Number.isFinite(target) && target > 0 ? target : null
}

export { getSettings }

export async function updateProfileSettings(
  userId: number,
  body: Record<string, unknown>,
) {
  const patch: Record<string, unknown> = {}
  if ('cuisinePrefs' in body) patch.cuisinePrefs = body.cuisinePrefs
  if ('dietaryRestrictions' in body)
    patch.dietaryRestrictions = body.dietaryRestrictions
  for (const field of TARGET_FIELDS) {
    if (field in body) patch[field] = toTarget(body[field])
  }
  return Object.keys(patch).length ? saveSettings(userId, patch) : {}
}

export async function changePassword(
  userId: number,
  current: unknown,
  next: string,
) {
  const user = await findUserById(userId)
  if (!user || !(await verifyPassword(String(current), user.passwordHash)))
    return false
  await updatePassword(userId, await hashPassword(next))
  return true
}
