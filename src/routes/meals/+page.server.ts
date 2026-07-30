import { favoriteMealIds, listMeals } from '$lib/server/repositories/meals'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const [rows, favIds] = await Promise.all([
    listMeals(locals.user?.id),
    favoriteMealIds(locals.user?.id),
  ])
  const favoritesOnly = url.searchParams.get('favorites') === '1'
  return {
    meals: rows
      .map((m) => ({ ...m, isFavorite: favIds.has(m.id) }))
      .filter((m) => !favoritesOnly || m.isFavorite),
    favoritesOnly,
  }
}
