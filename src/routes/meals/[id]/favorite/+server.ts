import { error } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { mealFavorites } from '$lib/schema'
import { assertCanEdit } from '$lib/server/meals'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const mealId = Number(params.id)
  await assertCanEdit(mealId, locals.user.id)
  const { favorite } = await request.json()

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
