import { vi, describe, it, expect, beforeEach } from 'vitest'

const autocomposeSlots = vi.hoisted(() => vi.fn())
const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockGetUserSettings = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/plans', () => ({
  autocomposeSlots,
  requireOwnedPlan: mockRequireOwnedPlan,
  validDateStr: (w: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w))
      throw Object.assign(new Error('Invalid week'), { status: 400 })
    return w
  },
  getUserSettings: mockGetUserSettings,
}))

import { POST } from './+server'

function makeEvent(planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve({}) },
    locals: { user: { id: userId } },
  } as any
}

describe('POST /plans/:id/autocompose', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(POST(makeEvent())).rejects.toMatchObject({ status: 404 })
  })

  it("passes the owner's resolved calorie target to autocompose", async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    })
    mockGetUserSettings.mockResolvedValueOnce({
      calorieTarget: 1800,
      proteinTarget: null,
      carbsTarget: null,
      fatTarget: null,
    })
    await POST(makeEvent())
    expect(autocomposeSlots).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      '2026-06-29',
      expect.objectContaining({ calories: 1800 }),
      1,
    )
  })

  it('falls back to the default calorie target when the user has none set', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    })
    await POST(makeEvent())
    expect(autocomposeSlots).toHaveBeenCalledWith(
      expect.anything(),
      '2026-06-29',
      expect.objectContaining({ calories: 2000 }),
      1,
    )
  })
})
