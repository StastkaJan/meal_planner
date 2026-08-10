import { mondayOf } from '$lib/utils/date-time'
import { createPlan } from '../repositories/plans'
import { monitorService } from '../observability'

export async function createUserPlan(userId: number) {
  return monitorService('plans', 'create', () =>
    createPlan(userId, {
      weekStart: mondayOf(new Date().toISOString().slice(0, 10)),
      cuisinePrefs: [],
      dietaryRestrictions: [],
    }),
  )
}
