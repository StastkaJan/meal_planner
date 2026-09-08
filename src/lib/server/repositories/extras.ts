import { and, eq } from 'drizzle-orm'
import { db } from '$lib/database'
import { savedExtras } from '$lib/database/schema'
import type { ExtraFields } from '$lib/domain/extras'

export const listSavedExtras = (userId: number) =>
  db
    .select()
    .from(savedExtras)
    .where(eq(savedExtras.userId, userId))
    .orderBy(savedExtras.name, savedExtras.id)

export async function saveExtra(userId: number, fields: ExtraFields) {
  const [extra] = await db
    .insert(savedExtras)
    .values({ userId, ...fields })
    .returning()
  return extra
}

export async function deleteSavedExtra(userId: number, id: number) {
  const rows = await db
    .delete(savedExtras)
    .where(and(eq(savedExtras.id, id), eq(savedExtras.userId, userId)))
    .returning({ id: savedExtras.id })
  return rows.length > 0
}
