import { mondayOf } from '$lib/date'
import { createPlan } from '../repositories/plans'
import { getSettings } from '../repositories/accounts'

export async function createUserPlan(userId: number, name: string) {
  const settings = await getSettings(userId)
  return createPlan(userId, {
    name,
    weekStart: mondayOf(new Date().toISOString().slice(0, 10)),
    cuisinePrefs: settings?.cuisinePrefs ?? [],
    dietaryRestrictions: settings?.dietaryRestrictions ?? [],
  })
}
