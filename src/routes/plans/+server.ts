import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { plans, userSettings } from '$lib/schema'
import { requireUser } from '$lib/auth'
import { getUserSettings } from '$lib/server/plans'
import { mondayOf } from '$lib/date'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const { id } = requireUser(locals)
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, id))
    .orderBy(plans.id)
  return json(rows)
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { id: userId } = requireUser(locals)
  const { name } = await request.json()
  const weekStart = mondayOf(new Date().toISOString().slice(0, 10))
  const s = await getUserSettings(userId)
  const [plan] = await db
    .insert(plans)
    .values({
      name,
      weekStart,
      userId,
      cuisinePrefs: s?.cuisinePrefs ?? [],
      dietaryRestrictions: s?.dietaryRestrictions ?? [],
    })
    .returning()
  return json(plan, { status: 201 })
}
