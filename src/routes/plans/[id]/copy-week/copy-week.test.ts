import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCopyWeek = vi.hoisted(() => vi.fn())
const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockRequirePro = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  requirePro: mockRequirePro,
}))
vi.mock('$lib/server/repositories/plans', () => ({ copyWeek: mockCopyWeek }))

import { POST } from './+server'

const event = () =>
  ({
    params: { id: '4' },
    request: {
      json: () => Promise.resolve({ from: '2026-08-24', to: '2026-08-31' }),
    },
    locals: { user: { id: 7, isPro: true } },
  }) as any

describe('POST /plans/:id/copy-week', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects Free users before loading or changing a plan', async () => {
    mockRequirePro.mockImplementationOnce(() => {
      throw Object.assign(new Error('Pro subscription required'), {
        status: 403,
      })
    })

    await expect(POST(event())).rejects.toMatchObject({ status: 403 })
    expect(mockRequireOwnedPlan).not.toHaveBeenCalled()
    expect(mockCopyWeek).not.toHaveBeenCalled()
  })

  it('copies a week for a Pro user', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 4, userId: 7 })

    const response = await POST(event())

    expect(response.status).toBe(204)
    expect(mockCopyWeek).toHaveBeenCalledWith(4, '2026-08-24', '2026-08-31')
  })
})
