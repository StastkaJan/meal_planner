import { requireAdmin } from '$lib/server/guards'
import { listMeals } from '$lib/server/repositories/meals'
import { listRecipeImports } from '$lib/server/repositories/recipe-imports'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals)
  const [imports, recipes] = await Promise.all([
    listRecipeImports(),
    listMeals(undefined, locals.locale),
  ])
  return { imports, recipes }
}
