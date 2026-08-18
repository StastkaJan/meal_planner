import { hashPassword, verifyPassword } from './auth'
import {
  findUserById,
  saveSettings,
  updatePassword,
} from '../repositories/accounts'
import { monitorService } from '../observability'

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

export function toPantryStaples(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]/)
      : []
  const staples = new Map<string, string>()

  for (const entry of entries) {
    if (typeof entry !== 'string') continue
    const name = entry.trim().slice(0, 100)
    const key = name.toLocaleLowerCase()
    if (name && !staples.has(key)) staples.set(key, name)
    if (staples.size === 100) break
  }
  return [...staples.values()]
}

export async function updateProfileSettings(
  userId: number,
  body: Record<string, unknown>,
) {
  return monitorService('profile', 'update_settings', async () => {
    const patch: Record<string, unknown> = {}
    if (body.cuisinePrefs !== undefined) patch.cuisinePrefs = body.cuisinePrefs
    if (body.dietaryRestrictions !== undefined)
      patch.dietaryRestrictions = body.dietaryRestrictions
    if (body.pantryStaples !== undefined)
      patch.pantryStaples = toPantryStaples(body.pantryStaples)
    for (const field of TARGET_FIELDS) {
      if (body[field] !== undefined) patch[field] = toTarget(body[field])
    }
    return Object.keys(patch).length ? saveSettings(userId, patch) : {}
  })
}

export async function changePassword(
  userId: number,
  current: unknown,
  next: string,
) {
  return monitorService('profile', 'change_password', async () => {
    const user = await findUserById(userId)
    if (!user || !(await verifyPassword(String(current), user.passwordHash)))
      return false
    await updatePassword(userId, await hashPassword(next))
    return true
  })
}
