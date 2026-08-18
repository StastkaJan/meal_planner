import { requireUser } from '$lib/server/guards'
import { getSettings } from '$lib/server/repositories/accounts'
import { getHouseholdDetail } from '$lib/server/repositories/households'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email } = requireUser(locals)
  const [s, household] = await Promise.all([
    getSettings(id),
    getHouseholdDetail(id),
  ])
  return {
    email,
    household,
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
  }
}
