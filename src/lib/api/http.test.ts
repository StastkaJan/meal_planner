import { afterEach, describe, expect, it, vi } from 'vitest'
import { request, requestOk } from './http'

afterEach(() => vi.unstubAllGlobals())

describe('requestOk', () => {
  it('rejects failed responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Archive failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await expect(requestOk('/meals/1', { method: 'DELETE' })).rejects.toThrow(
      'Archive failed',
    )
  })

  it('leaves raw responses available to callers that inspect status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 409 })),
    )

    await expect(request('/plans/1')).resolves.toMatchObject({ status: 409 })
  })
})
