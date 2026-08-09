import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkDatabase = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/health', () => ({ checkDatabase }))

import { GET } from './+server'

describe('GET /health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports a healthy database', async () => {
    checkDatabase.mockResolvedValueOnce(undefined)
    const response = await GET({} as any)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('reports an unavailable database', async () => {
    checkDatabase.mockRejectedValueOnce(new Error('offline'))
    const response = await GET({} as any)
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: 'unhealthy' })
  })
})
