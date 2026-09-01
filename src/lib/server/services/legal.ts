import {
  getLegalDocumentEvents,
  saveLegalDocumentEvent,
} from '../repositories/legal'
import { CURRENT_LEGAL_DOCUMENTS, type LegalDocument } from '$lib/legal'

export async function getPendingLegalNotices(userId: number) {
  const recorded = await getLegalDocumentEvents(userId)
  const keys = new Set(
    recorded.map(({ document, version }) => `${document}:${version}`),
  )
  return CURRENT_LEGAL_DOCUMENTS.filter(
    ({ document, version }) => !keys.has(`${document}:${version}`),
  )
}

export async function recordCurrentLegalNotice(
  userId: number,
  document: LegalDocument,
  version: string,
) {
  const notice = CURRENT_LEGAL_DOCUMENTS.find(
    (item) => item.document === document && item.version === version,
  )
  if (!notice) return false
  await saveLegalDocumentEvent(userId, notice)
  return true
}
