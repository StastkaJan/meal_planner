import { json } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { recordCurrentLegalNotice } from '$lib/server/services/legal'
import type { LegalDocument } from '$lib/legal'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { id } = requireUser(locals)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid legal document version' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid legal document version' }, { status: 400 })
  }
  const { document, version } = body as Record<string, unknown>
  if (
    (document !== 'terms' && document !== 'privacy') ||
    typeof version !== 'string' ||
    !(await recordCurrentLegalNotice(id, document as LegalDocument, version))
  ) {
    return json({ error: 'Invalid legal document version' }, { status: 400 })
  }
  return json({ success: true })
}
