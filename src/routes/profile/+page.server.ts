import { db } from '$lib/db'
import { userSettings } from '$lib/schema'
import { requireUser } from '$lib/auth'
import { eq } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email } = requireUser(locals)
  const [s] = await db
    .select({
      cuisinePrefs: userSettings.cuisinePrefs,
      dietaryRestrictions: userSettings.dietaryRestrictions,
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, id))
    .limit(1)
  return {
    email,
    cuisinePrefs: s?.cuisinePrefs ?? [],
    dietaryRestrictions: s?.dietaryRestrictions ?? [],
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
  }
}
