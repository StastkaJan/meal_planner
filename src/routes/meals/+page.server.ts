import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { visibleToUser, favoriteMealIds } from '$lib/server/meals'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const [rows, favIds] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(visibleToUser(locals.user?.id))
      .orderBy(meals.name),
    favoriteMealIds(locals.user?.id),
  ])
  return {
    meals: rows.map((m) => ({ ...m, isFavorite: favIds.has(m.id) })),
  }
}
