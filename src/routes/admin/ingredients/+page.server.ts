import { requireAdmin } from '$lib/server/guards'
import { listManagedIngredients } from '$lib/server/repositories/ingredients'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  requireAdmin(locals)
  const query = (url.searchParams.get('q') ?? '').slice(0, 100)
  const value = Number(url.searchParams.get('page') ?? 1)
  const page =
    Number.isSafeInteger(value) && value > 0 ? Math.min(value, 10000) : 1
  const missing = url.searchParams.get('missing') === '1'
  return {
    ...(await listManagedIngredients(query, page, missing)),
    query,
    missing,
  }
}
