import { favoriteMealIds, listMeals } from '$lib/server/repositories/meals'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 10

export const load: PageServerLoad = async ({ locals, url }) => {
  const [rows, favIds] = await Promise.all([
    listMeals(locals.user?.id, locals.locale),
    favoriteMealIds(locals.user?.id),
  ])
  const favoritesOnly = url.searchParams.get('favorites') === '1'
  const myRecipesOnly = url.searchParams.get('mine') === '1'
  const query = url.searchParams.get('q')?.trim() ?? ''
  const difficulty = url.searchParams.get('difficulty') ?? ''
  const requestedPage = Math.max(1, Number(url.searchParams.get('page')) || 1)
  // ponytail: paginate the in-memory visible library; move filters into SQL when
  // meal counts make loading the full user-visible list measurably expensive.
  const filtered = rows
    .map((meal) => ({ ...meal, isFavorite: favIds.has(meal.id) }))
    .filter((meal) => !favoritesOnly || meal.isFavorite)
    .filter(
      (meal) =>
        !myRecipesOnly ||
        (locals.user != null && meal.userId === locals.user.id),
    )
    .filter((meal) => !difficulty || meal.difficulty === difficulty)
    .filter((meal) => {
      if (!query) return true
      const haystack = [meal.name, meal.description, ...(meal.tags ?? [])]
        .join(' ')
        .toLocaleLowerCase()
      return haystack.includes(query.toLocaleLowerCase())
    })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  return {
    meals: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    favoritesOnly,
    myRecipesOnly,
    query,
    difficulty,
    page,
    totalPages,
    totalResults: filtered.length,
    isAdmin: locals.user?.isAdmin ?? false,
    locale: locals.locale,
  }
}
