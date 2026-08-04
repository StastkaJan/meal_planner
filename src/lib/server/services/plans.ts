import { mondayOf } from '$lib/utils/date-time'
import { createPlan } from '../repositories/plans'

export async function createUserPlan(userId: number) {
  return createPlan(userId, {
    weekStart: mondayOf(new Date().toISOString().slice(0, 10)),
    cuisinePrefs: [],
    dietaryRestrictions: [],
  })
}
