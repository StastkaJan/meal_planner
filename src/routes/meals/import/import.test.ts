import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchPublicHtml = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/services/safe-fetch', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchPublicHtml,
}))

import { SafeFetchError } from '$lib/server/services/safe-fetch'
import { POST } from './+server'

function makeEvent(body: object, isPro = true) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: 1, isAdmin: false, isPro } },
  } as any
}

const recipeHtml = (node: object) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(node)}</script></head></html>`

describe('POST /meals/import', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects free users before fetching', async () => {
    await expect(
      POST(makeEvent({ url: 'https://recipes.example.com/r' }, false)),
    ).rejects.toMatchObject({ status: 403 })
    expect(fetchPublicHtml).not.toHaveBeenCalled()
  })

  it('passes safe-fetch failures through', async () => {
    fetchPublicHtml.mockRejectedValueOnce(
      new SafeFetchError(400, 'URL must resolve only to public addresses'),
    )
    await expect(
      POST(makeEvent({ url: 'http://localhost/recipe' })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('returns 422 when the page has no Recipe data', async () => {
    fetchPublicHtml.mockResolvedValueOnce(recipeHtml({ '@type': 'Article' }))
    await expect(
      POST(makeEvent({ url: 'https://recipes.example.com/r' })),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('parses a Recipe fetched from a public URL', async () => {
    fetchPublicHtml.mockResolvedValueOnce(
      recipeHtml({
        '@type': 'Recipe',
        name: 'Soup',
        recipeIngredient: ['water'],
      }),
    )
    const out = await POST(makeEvent({ url: 'https://recipes.example.com/r' }))
    expect(await out.json()).toEqual({
      name: 'Soup',
      ingredients: [{ name: 'water', qty: null, unit: null }],
    })
  })

  it('parses pasted JSON-LD without fetching', async () => {
    const out = await POST(
      makeEvent({ text: JSON.stringify({ '@type': 'Recipe', name: 'Paste' }) }),
    )
    expect(await out.json()).toMatchObject({ name: 'Paste' })
    expect(fetchPublicHtml).not.toHaveBeenCalled()
  })
})
