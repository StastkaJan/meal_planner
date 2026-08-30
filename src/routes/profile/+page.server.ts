import { requireUser } from '$lib/server/guards'
import { getSettings } from '$lib/server/repositories/accounts'
import {
  getHouseholdDetail,
  getHouseholdInvitations,
} from '$lib/server/repositories/households'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email } = requireUser(locals)
  const [s, household, householdInvitations] = await Promise.all([
    getSettings(id),
    getHouseholdDetail(id),
    getHouseholdInvitations(id),
  ])
  return {
    email,
    locale: s?.locale ?? locals.locale,
    pantryStaples: s?.pantryStaples ?? [],
    household,
    householdInvitations,
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
  }
}
