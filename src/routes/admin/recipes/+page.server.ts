import { requireAdmin } from '$lib/server/guards'
import { listSharedMealSummaries } from '$lib/server/repositories/meals'
import { listRecipeImports } from '$lib/server/repositories/recipe-imports'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals)
  const [imports, recipes] = await Promise.all([
    listRecipeImports(),
    listSharedMealSummaries(locals.locale),
  ])
  return { imports, recipes }
}
