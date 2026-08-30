import { vi, describe, it, expect, beforeEach } from 'vitest'

const executePlanPopulation = vi.hoisted(() => vi.fn())
const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockRequirePro = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  requirePro: mockRequirePro,
}))
vi.mock('$lib/server/services/plan-generation', () => ({
  executePlanPopulation,
}))

import { POST } from './+server'

function makeEvent(planId = '1', userId = 1, body: object = {}) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId, isPro: true } },
  } as any
}

describe('POST /plans/:id/autocompose', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires Pro access', async () => {
    mockRequirePro.mockImplementationOnce(() => {
      throw Object.assign(new Error('Pro subscription required'), {
        status: 403,
      })
    })
    await expect(POST(makeEvent())).rejects.toMatchObject({ status: 403 })
    expect(mockRequireOwnedPlan).not.toHaveBeenCalled()
  })

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(POST(makeEvent())).rejects.toMatchObject({ status: 404 })
  })

  it('passes a serializable population command and the loaded plan', async () => {
    const plan = {
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    }
    mockRequireOwnedPlan.mockResolvedValueOnce(plan)
    await POST(makeEvent())
    expect(executePlanPopulation).toHaveBeenCalledWith(
      {
        type: 'populate-plan',
        planId: 1,
        userId: 1,
        week: '2026-06-29',
        favoritesOnly: false,
      },
      plan,
    )
  })

  it('uses the requested week', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    })
    await POST(makeEvent('1', 1, { week: '2026-07-06' }))
    expect(executePlanPopulation).toHaveBeenCalledWith(
      expect.objectContaining({ week: '2026-07-06' }),
      expect.anything(),
    )
  })

  it('passes favoritesOnly through to autocomposeSlots', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    })
    await POST(makeEvent('1', 1, { favoritesOnly: true }))
    expect(executePlanPopulation).toHaveBeenCalledWith(
      expect.objectContaining({ favoritesOnly: true }),
      expect.anything(),
    )
  })

  it('reports how many slots were filled, so the caller can tell a no-op apart', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      weekStart: '2026-06-29',
      userId: 1,
      cuisinePrefs: [],
      dietaryRestrictions: [],
    })
    executePlanPopulation.mockResolvedValueOnce(0)
    const res = await POST(makeEvent('1', 1, { favoritesOnly: true }))
    expect(await res.json()).toEqual({ filled: 0 })
  })
})
