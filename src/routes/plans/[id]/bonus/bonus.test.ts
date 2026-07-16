import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockAddBonusItem = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/plans', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  addBonusItem: mockAddBonusItem,
  validDateStr: (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      throw Object.assign(new Error('Invalid date'), { status: 400 })
    return d
  },
}))

import { POST } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('POST /plans/:id/bonus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(
      POST(makeEvent({ date: '2026-06-30', name: 'Pizza' })),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('rejects an invalid date with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      POST(makeEvent({ date: 'not-a-date', name: 'Pizza' })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects a blank name with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      POST(makeEvent({ date: '2026-06-30', name: '   ' })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('creates the bonus item, trims the name, and returns 201', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockAddBonusItem.mockResolvedValueOnce({ id: 9, name: 'Pizza' })
    const res = await POST(
      makeEvent({ date: '2026-06-30', name: '  Pizza  ', calories: 900 }),
    )
    expect(res.status).toBe(201)
    expect(mockAddBonusItem).toHaveBeenCalledWith(1, '2026-06-30', {
      name: 'Pizza',
      calories: 900,
      proteinG: null,
      carbsG: null,
      fatG: null,
    })
  })
})
