import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRecalcDaySlots = vi.hoisted(() => vi.fn())
const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockGetUserSettings = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/plans', () => ({
  recalcDaySlots: mockRecalcDaySlots,
  requireOwnedPlan: mockRequireOwnedPlan,
  validDateStr: (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      throw Object.assign(new Error('Invalid date'), { status: 400 })
    return d
  },
  getUserSettings: mockGetUserSettings,
}))

import { POST } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('POST /plans/:id/recalc-day', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(POST(makeEvent({ date: '2026-06-30' }))).rejects.toMatchObject(
      { status: 404 },
    )
  })

  it('rejects an invalid date with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(POST(makeEvent({ date: 'nope' }))).rejects.toMatchObject({
      status: 400,
    })
  })

  it("passes the owner's resolved targets and date to recalcDaySlots", async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockGetUserSettings.mockResolvedValueOnce({
      calorieTarget: 1800,
      proteinTarget: null,
      carbsTarget: null,
      fatTarget: null,
    })
    const res = await POST(makeEvent({ date: '2026-06-30' }))
    expect(res.status).toBe(204)
    expect(mockRecalcDaySlots).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      '2026-06-30',
      expect.objectContaining({ calories: 1800 }),
      1,
    )
  })
})
