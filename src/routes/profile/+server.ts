import { json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { users, userSettings } from '$lib/schema'
import { requireUser, verifyPassword, hashPassword } from '$lib/auth'
import type { RequestHandler } from './$types'

const TARGET_FIELDS = [
  'calorieTarget',
  'proteinTarget',
  'carbsTarget',
  'fatTarget',
] as const

function toTarget(v: unknown): number | null {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : null
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const { id } = requireUser(locals)
  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if ('cuisinePrefs' in body) patch.cuisinePrefs = body.cuisinePrefs
  if ('dietaryRestrictions' in body)
    patch.dietaryRestrictions = body.dietaryRestrictions
  for (const f of TARGET_FIELDS) {
    if (f in body) patch[f] = toTarget(body[f])
  }

  if (!Object.keys(patch).length) return json({})

  const [s] = await db
    .insert(userSettings)
    .values({ userId: id, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch })
    .returning()
  return json(s)
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { id } = requireUser(locals)
  const { current, next } = await request.json()

  if (typeof next !== 'string' || next.length < 8)
    return json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 },
    )
  if (typeof next === 'string' && next.length > 128)
    return json(
      { error: 'New password must be at most 128 characters' },
      { status: 400 },
    )

  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!row || !(await verifyPassword(String(current), row.passwordHash)))
    return json({ error: 'Current password is incorrect' }, { status: 400 })

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, id))
  return json({ success: true })
}
