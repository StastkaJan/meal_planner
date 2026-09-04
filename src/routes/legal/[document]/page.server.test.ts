import { describe, expect, it } from 'vitest'
import { entries, load, prerender } from './+page.server'

async function loadDocument(document: string) {
  return load({ params: { document } } as Parameters<typeof load>[0])
}

describe('legal document page', () => {
  it('prerenders every supported legal document', () => {
    expect(prerender).toBe(true)
    expect(entries()).toEqual([{ document: 'terms' }, { document: 'privacy' }])
  })

  it('renders the UTF-8 terms document as HTML', async () => {
    const result = await loadDocument('terms')

    expect(result).toMatchObject({ title: 'Podmínky používání' })
    expect(result).toHaveProperty('html')
    expect((result as { html: string }).html).toContain(
      '<h1>Podmínky používání služby Papu Plan</h1>',
    )
  })

  it('renders the UTF-8 privacy document as HTML', async () => {
    const result = await loadDocument('privacy')

    expect(result).toMatchObject({
      title: 'Informace o zpracování osobních údajů',
    })
    expect((result as { html: string }).html).toContain(
      '<h1>Informace o zpracování osobních údajů</h1>',
    )
  })

  it('rejects unknown documents', async () => {
    await expect(loadDocument('missing')).rejects.toMatchObject({ status: 404 })
  })
})
