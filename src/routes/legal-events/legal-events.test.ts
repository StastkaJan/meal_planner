import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordCurrentLegalNotice = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/services/legal', () => ({ recordCurrentLegalNotice }))

import { POST } from './+server'

function event(body: object, userId?: number) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: userId ? { user: { id: userId } } : {},
  } as any
}

beforeEach(() => vi.clearAllMocks())

describe('POST /legal-events', () => {
  it('requires authentication', async () => {
    await expect(POST(event({}))).rejects.toMatchObject({ status: 401 })
  })

  it('rejects stale or unknown document versions', async () => {
    recordCurrentLegalNotice.mockResolvedValueOnce(false)
    const response = await POST(
      event({ document: 'terms', version: 'old' }, 42),
    )
    expect(response.status).toBe(400)
  })

  it('records the current document for the caller', async () => {
    recordCurrentLegalNotice.mockResolvedValueOnce(true)
    const response = await POST(
      event({ document: 'privacy', version: '0.1' }, 42),
    )
    expect(response.status).toBe(200)
    expect(recordCurrentLegalNotice).toHaveBeenCalledWith(42, 'privacy', '0.1')
  })
})
