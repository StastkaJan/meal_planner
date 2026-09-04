import { queryMealLibrary } from '$lib/server/repositories/meals'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 10

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user!.id
  const favoritesOnly = url.searchParams.get('favorites') === '1'
  const myRecipesOnly = url.searchParams.get('mine') === '1'
  const query = url.searchParams.get('q')?.trim() ?? ''
  const difficulty = url.searchParams.get('difficulty') ?? ''
  const requestedPage = Math.max(
    1,
    Math.floor(Number(url.searchParams.get('page'))) || 1,
  )
  const result = await queryMealLibrary(userId, locals.locale, {
    favoritesOnly,
    myRecipesOnly,
    query,
    difficulty,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  })
  return {
    meals: result.meals,
    favoritesOnly,
    myRecipesOnly,
    query,
    difficulty,
    page: result.page,
    totalPages: result.totalPages,
    totalResults: result.totalResults,
    isAdmin: locals.user?.isAdmin ?? false,
    locale: locals.locale,
  }
}
