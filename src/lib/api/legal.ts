import type { LegalDocument } from '$lib/legal'
import { jsonBody, requestJson } from './http'

export const recordLegalNotice = (document: LegalDocument, version: string) =>
  requestJson<{ success: true }>('/legal-events', {
    method: 'POST',
    body: jsonBody({ document, version }),
  })
