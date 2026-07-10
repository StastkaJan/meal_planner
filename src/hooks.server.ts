import type { Handle } from '@sveltejs/kit'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '$lib/db'
import { sessions, users } from '$lib/schema'

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session')
  if (token) {
    const [row] = await db
      .select({ id: users.id, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
      .limit(1)
    if (row) event.locals.user = row
  }
  return resolve(event)
}
