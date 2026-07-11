import { db } from '$lib/db'
import { meals } from '$lib/schema'
import { visibleToUser } from '$lib/server/meals'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const rows = await db
    .select()
    .from(meals)
    .where(visibleToUser(locals.user?.id))
    .orderBy(meals.name)
  return { meals: rows }
}
