import { vi, describe, it, expect, afterEach } from 'vitest'
import { POST } from './+server'

function makeEvent(body: object) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: 1 } },
  } as any
}

function res(status: number, opts: { location?: string; body?: string } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (k: string) => (k === 'location' ? (opts.location ?? null) : null),
    },
    text: () => Promise.resolve(opts.body ?? ''),
  }
}

const recipeHtml = (node: object) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(node)}</script></head></html>`

describe('POST /meals/import', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects a non-public URL without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      POST(makeEvent({ url: 'http://localhost/recipe' })),
    ).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a redirect that points at an internal host (SSRF guard)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        res(302, { location: 'http://169.254.169.254/latest/meta-data' }),
      )
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      POST(makeEvent({ url: 'https://recipes.example.com/r' })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('returns 422 when the page has no Recipe data', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          res(200, { body: recipeHtml({ '@type': 'Article' }) }),
        ),
    )
    await expect(
      POST(makeEvent({ url: 'https://recipes.example.com/r' })),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('parses a Recipe fetched from a public URL', async () => {
    const html = recipeHtml({
      '@type': 'Recipe',
      name: 'Soup',
      recipeIngredient: ['water'],
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(res(200, { body: html })),
    )
    const out = await POST(makeEvent({ url: 'https://recipes.example.com/r' }))
    expect(out.status).toBe(200)
    expect(await out.json()).toEqual({ name: 'Soup', ingredients: ['water'] })
  })

  it('parses pasted JSON-LD text without any fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const out = await POST(
      makeEvent({ text: JSON.stringify({ '@type': 'Recipe', name: 'Paste' }) }),
    )
    expect(await out.json()).toMatchObject({ name: 'Paste' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
