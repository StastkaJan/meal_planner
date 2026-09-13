import { requireUser } from '$lib/server/guards'
import { getSettings } from '$lib/server/repositories/accounts'
import { listIngredientOptions } from '$lib/server/repositories/ingredients'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { id, email, isPro } = requireUser(locals)
  const s = await getSettings(id)
  return {
    email,
    isPro,
    locale: s?.locale ?? locals.locale,
    pantryStaples: s?.pantryStaples ?? [],
    pantryIngredientIds: s?.pantryIngredientIds ?? [],
    ingredientOptions: await listIngredientOptions(id),
    calorieTarget: s?.calorieTarget ?? null,
    proteinTarget: s?.proteinTarget ?? null,
    carbsTarget: s?.carbsTarget ?? null,
    fatTarget: s?.fatTarget ?? null,
    fiberTarget: s?.fiberTarget ?? null,
    sugarTarget: s?.sugarTarget ?? null,
    saturatedFatTarget: s?.saturatedFatTarget ?? null,
    saltTarget: s?.saltTarget ?? null,
  }
}
