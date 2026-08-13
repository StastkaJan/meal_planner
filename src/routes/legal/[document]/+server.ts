import { error } from '@sveltejs/kit'
import terms from '../../../../docs/terms-and-conditions.cs.md?raw'
import privacy from '../../../../docs/privacy-policy.cs.md?raw'
import type { RequestHandler } from './$types'

const documents: Record<string, string> = { terms, privacy }

export const GET: RequestHandler = ({ params }) => {
  const document = documents[params.document]
  if (!document) error(404, 'Legal document not found')
  return new Response(document, {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  })
}
