import { vi, describe, it, expect, afterEach } from 'vitest'
import { POST } from './+server'

function makeEvent(body: object, user: { id: number } | null = { id: 1 }) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user },
  } as any
}

function res(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  }
}

describe('POST /meals/import/edamam', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('rejects unauthenticated callers', async () => {
    await expect(
      POST(makeEvent({ query: 'soup' }, null)),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('rejects a blank query', async () => {
    await expect(POST(makeEvent({ query: '  ' }))).rejects.toMatchObject({
      status: 400,
    })
  })

  it('returns 500 when Edamam credentials are not configured', async () => {
    vi.stubEnv('EDAMAM_APP_ID', '')
    vi.stubEnv('EDAMAM_APP_KEY', '')
    await expect(POST(makeEvent({ query: 'soup' }))).rejects.toMatchObject({
      status: 500,
    })
  })

  it('returns 502 when the Edamam request fails', async () => {
    vi.stubEnv('EDAMAM_APP_ID', 'id')
    vi.stubEnv('EDAMAM_APP_KEY', 'key')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')))
    await expect(POST(makeEvent({ query: 'soup' }))).rejects.toMatchObject({
      status: 502,
    })
  })

  it('returns 422 when there are no hits', async () => {
    vi.stubEnv('EDAMAM_APP_ID', 'id')
    vi.stubEnv('EDAMAM_APP_KEY', 'key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(res(200, { hits: [] })),
    )
    await expect(POST(makeEvent({ query: 'soup' }))).rejects.toMatchObject({
      status: 422,
    })
  })

  it('maps the top hit on success', async () => {
    vi.stubEnv('EDAMAM_APP_ID', 'id')
    vi.stubEnv('EDAMAM_APP_KEY', 'key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        res(200, {
          hits: [
            {
              recipe: {
                label: 'Soup',
                ingredientLines: ['water'],
                calories: 100,
              },
            },
          ],
        }),
      ),
    )
    const out = await POST(makeEvent({ query: 'soup' }))
    expect(out.status).toBe(200)
    expect(await out.json()).toEqual({
      name: 'Soup',
      ingredients: ['water'],
      calories: 100,
    })
  })
})
