import { eq } from 'drizzle-orm'
import { db } from '$lib/database'
import { legalDocumentEvents } from '$lib/database/schema'
import type { LegalNotice } from '$lib/legal'

export async function getLegalDocumentEvents(userId: number) {
  return db
    .select({
      document: legalDocumentEvents.document,
      version: legalDocumentEvents.version,
    })
    .from(legalDocumentEvents)
    .where(eq(legalDocumentEvents.userId, userId))
}

export async function saveLegalDocumentEvent(
  userId: number,
  notice: LegalNotice,
) {
  await db
    .insert(legalDocumentEvents)
    .values({
      userId,
      document: notice.document,
      version: notice.version,
      action: notice.action,
    })
    .onConflictDoNothing()
}
