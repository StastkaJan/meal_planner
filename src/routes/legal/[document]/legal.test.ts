import { describe, expect, it } from 'vitest'
import { GET } from './+server'

describe('GET /legal/[document]', () => {
  it.each([
    ['terms', 'Podmínky používání služby Meal Plan'],
    ['privacy', 'Informace o zpracování osobních údajů'],
  ])('serves the %s document', async (document, heading) => {
    const response = await GET({ params: { document } } as any)

    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    )
    expect(await response.text()).toContain(heading)
  })

  it('returns 404 for an unknown document', () => {
    expect(() => GET({ params: { document: 'unknown' } } as any)).toThrow()
  })
})
