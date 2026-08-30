import { requireUser } from '$lib/server/guards'
import { getSettings } from '$lib/server/repositories/accounts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email, isPro } = requireUser(locals)
  const s = await getSettings(id)
  return {
    email,
    isPro,
    locale: s?.locale ?? locals.locale,
    pantryStaples: s?.pantryStaples ?? [],
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
  }
}
