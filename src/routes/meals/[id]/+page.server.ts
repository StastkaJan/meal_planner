import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { canAccessMeal } from '$lib/server/meals'
import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const [meal] = await db
    .select()
    .from(meals)
    .where(eq(meals.id, Number(params.id)))
  // hide another user's personal meal — indistinguishable from "not found"
  if (!meal || !canAccessMeal(meal, locals.user?.id))
    error(404, 'Meal not found')
  return { meal }
}
