import { and, eq, gt, lte } from 'drizzle-orm'
import { db } from '$lib/database'
import { sessions, users, userSettings } from '$lib/database/schema'

export async function findSessionUser(token: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
      isPro: users.isPro,
      locale: userSettings.locale,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return user ?? null
}

export async function saveSession(id: string, userId: number, expiresAt: Date) {
  await pruneExpiredSessions()
  await db.insert(sessions).values({ id, userId, expiresAt })
}

let nextCleanup = 0
export async function pruneExpiredSessions(now = new Date()) {
  if (now.getTime() < nextCleanup) return
  nextCleanup = now.getTime() + 60 * 60 * 1000
  try {
    await db.delete(sessions).where(lte(sessions.expiresAt, now))
  } catch (error) {
    nextCleanup = 0
    throw error
  }
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}
