import { requireAdmin } from '$lib/server/guards'
import { listRecipeImports } from '$lib/server/repositories/recipe-imports'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals)
  return { imports: await listRecipeImports() }
}
