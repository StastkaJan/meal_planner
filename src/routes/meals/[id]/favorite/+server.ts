import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals, mealFavorites } from '$lib/schema'
import { visibleToUser } from '$lib/server/meals'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const mealId = Number(params.id)
  const { favorite } = await request.json()

  const [meal] = await db
    .select({ id: meals.id })
    .from(meals)
    .where(and(eq(meals.id, mealId), visibleToUser(locals.user.id)))
    .limit(1)
  if (!meal) error(404, 'Meal not found')

  if (favorite) {
    await db
      .insert(mealFavorites)
      .values({ userId: locals.user.id, mealId })
      .onConflictDoNothing()
  } else {
    await db
      .delete(mealFavorites)
      .where(
        and(
          eq(mealFavorites.userId, locals.user.id),
          eq(mealFavorites.mealId, mealId),
        ),
      )
  }
  return new Response(null, { status: 204 })
}
