import { json, error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { pickMealFields } from '$lib/server/meals'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const id = Number(params.id)
  const values = pickMealFields(await request.json())
  const [updated] = await db
    .update(meals)
    .set(values)
    .where(eq(meals.id, id))
    .returning()
  if (!updated) error(404, 'Meal not found')
  return json(updated)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const id = Number(params.id)
  await db.delete(meals).where(eq(meals.id, id))
  return new Response(null, { status: 204 })
}
