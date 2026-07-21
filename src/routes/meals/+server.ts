import { json, error } from '@sveltejs/kit'
import { db } from '$lib/db'
import { meals } from '$lib/schema'
import {
  pickMealFields,
  visibleToUser,
  syncMealIngredients,
} from '$lib/server/meals'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const rows = await db
    .select()
    .from(meals)
    .where(visibleToUser(locals.user?.id))
    .orderBy(meals.name)
  return json(rows)
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const body = await request.json()
  const values = pickMealFields(body)
  if (!values.name) error(400, 'Name is required')
  // ownership is server-set (never from the whitelist): scope=personal → mine, else global
  values.userId = body.scope === 'personal' ? locals.user.id : null
  const meal = await db.transaction(async (tx) => {
    const [meal] = await tx
      .insert(meals)
      .values(values as { name: string })
      .returning()
    await syncMealIngredients(tx, meal.id, meal.ingredients)
    return meal
  })
  return json(meal, { status: 201 })
}
