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

  it("passes the owner's resolved targets and date to recalcDaySlots, returns the fill count", async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockGetUserSettings.mockResolvedValueOnce({
      calorieTarget: 1800,
      proteinTarget: null,
      carbsTarget: null,
      fatTarget: null,
    })
    mockRecalcDaySlots.mockResolvedValueOnce(2)
    const res = await POST(makeEvent({ date: '2026-06-30' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ filled: 2 })
    expect(mockRecalcDaySlots).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      '2026-06-30',
      expect.objectContaining({ calories: 1800 }),
      1,
    )
  })

  it('reports filled: 0 when the day has no empty slots', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockGetUserSettings.mockResolvedValueOnce(null)
    mockRecalcDaySlots.mockResolvedValueOnce(0)
    const res = await POST(makeEvent({ date: '2026-06-30' }))
    expect(await res.json()).toEqual({ filled: 0 })
  })

  it('rejects a malformed request body with 400 instead of throwing unhandled', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      POST({
        params: { id: '1' },
        request: { json: () => Promise.reject(new Error('bad body')) },
        locals: { user: { id: 1 } },
      } as any),
    ).rejects.toMatchObject({ status: 400 })
  })
})
