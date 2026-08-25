import { and, eq, gt } from 'drizzle-orm'
import { db } from '$lib/database'
import { sessions, users, userSettings } from '$lib/database/schema'

export async function findSessionUser(token: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      isAdmin: users.isAdmin,
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
  await db.insert(sessions).values({ id, userId, expiresAt })
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}
