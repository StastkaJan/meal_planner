import { requireAdmin } from '$lib/server/guards'
import {
  listIngredientOptions,
  listMergeSources,
} from '$lib/server/repositories/ingredients'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals)
  const query = (url.searchParams.get('q') ?? '').slice(0, 100)
  const [sources, targets] = await Promise.all([
    listMergeSources(query),
    listIngredientOptions(null),
  ])
  return { sources, targets, query }
}
