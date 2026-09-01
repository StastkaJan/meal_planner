import { error } from '@sveltejs/kit'
import { marked } from 'marked'
import privacy from '../../../../static/legal/privacy.md?raw'
import terms from '../../../../static/legal/terms.md?raw'
import type { PageServerLoad } from './$types'

const documents = {
  terms: { title: 'Podmínky používání', markdown: terms },
  privacy: {
    title: 'Informace o zpracování osobních údajů',
    markdown: privacy,
  },
} as const

export const load: PageServerLoad = async ({ params }) => {
  const document = documents[params.document as keyof typeof documents]
  if (!document) error(404, 'Legal document not found')

  return {
    title: document.title,
    // The Markdown is bundled application content, never user-provided input.
    html: await marked.parse(document.markdown.replace(/^\uFEFF/, '')),
  }
}
