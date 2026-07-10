import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { plans } from '$lib/schema'
import type { RequestHandler } from './$types'
import { ownedPlan, validWeek, getPlanDetail } from '$lib/server/plans'

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const id = Number(params.id)
  const plan = await ownedPlan(id, locals.user!.id)
  const week = validWeek(url.searchParams.get('week') ?? plan.weekStart)
  const result = await getPlanDetail(plan, week)
  return json(result)
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const id = Number(params.id)
  await ownedPlan(id, locals.user!.id)
  const { name, cuisinePrefs, dietaryRestrictions } = await request.json()
  const [updated] = await db
    .update(plans)
    .set({ name, cuisinePrefs, dietaryRestrictions })
    .where(eq(plans.id, id))
    .returning()
  return json(updated)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.id)
  await ownedPlan(id, locals.user!.id)
  await db.delete(plans).where(eq(plans.id, id))
  return new Response(null, { status: 204 })
}
