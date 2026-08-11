import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordClientError = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/observability', () => ({ recordClientError }))

import { POST } from './+server'

describe('POST /client-errors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records a bounded browser error', async () => {
    const response = await POST({
      request: new Request('http://localhost/client-errors', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'sveltekit',
          message: 'boom',
          stack: 'x'.repeat(5000),
          path: '/meals',
          status: 500,
        }),
      }),
      locals: { user: { id: 7 } },
    } as any)

    expect(response.status).toBe(204)
    expect(recordClientError).toHaveBeenCalledWith('sveltekit', {
      message: 'boom',
      stack: 'x'.repeat(4000),
      path: '/meals',
      status: 500,
      userId: 7,
    })
  })

  it('rejects invalid reports', async () => {
    await expect(
      POST({
        request: new Request('http://localhost/client-errors', {
          method: 'POST',
          body: 'null',
        }),
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 400 })
    expect(recordClientError).not.toHaveBeenCalled()
  })
})
