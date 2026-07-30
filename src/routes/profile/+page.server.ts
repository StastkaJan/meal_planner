import { requireUser } from '$lib/server/guards'
import { getSettings } from '$lib/server/repositories/accounts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email } = requireUser(locals)
  const s = await getSettings(id)
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
