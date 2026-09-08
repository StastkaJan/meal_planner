import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireOwnedPlan = vi.hoisted(() => vi.fn())
const clearPlan = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({ requireOwnedPlan }))
vi.mock('$lib/server/repositories/plans', () => ({ clearPlan }))
import { POST } from './+server'

const event = (body: unknown) =>
  ({
    params: { id: '4' },
    locals: {},
    request: { json: async () => body },
  }) as any

describe('POST /plans/:id/clear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireOwnedPlan.mockResolvedValue({ id: 4, userId: 7 })
  })

  it.each([{ date: '2026-09-01' }, {}])(
    'clears the requested scope: %j',
    async (body) => {
      expect((await POST(event(body))).status).toBe(204)
      expect(clearPlan).toHaveBeenCalledExactlyOnceWith(
        4,
        'date' in body ? body.date : undefined,
      )
    },
  )

  it.each([
    null,
    { date: null },
    { date: '' },
    { date: '2026-02-30' },
    { day: '2026-09-01' },
  ])('rejects invalid scope without clearing: %j', async (body) => {
    await expect(POST(event(body))).rejects.toMatchObject({ status: 400 })
    expect(clearPlan).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON instead of clearing all weeks', async () => {
    const request = event({})
    request.request.json = async () => {
      throw new Error('Bad JSON')
    }
    await expect(POST(request)).rejects.toMatchObject({ status: 400 })
    expect(clearPlan).not.toHaveBeenCalled()
  })

  it('requires ownership before clearing', async () => {
    requireOwnedPlan.mockRejectedValueOnce({ status: 404 })
    await expect(POST(event({}))).rejects.toMatchObject({ status: 404 })
    expect(clearPlan).not.toHaveBeenCalled()
  })
})
