import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRecalculatePlanDay = vi.hoisted(() => vi.fn())
const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockRequirePro = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  requirePro: mockRequirePro,
}))
vi.mock('$lib/server/services/plan-generation', () => ({
  recalculatePlanDay: mockRecalculatePlanDay,
}))

import { POST } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId, isPro: true } },
  } as any
}

describe('POST /plans/:id/recalc-day', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires Pro access', async () => {
    mockRequirePro.mockImplementationOnce(() => {
      throw Object.assign(new Error('Pro subscription required'), {
        status: 403,
      })
    })
    await expect(POST(makeEvent({ date: '2026-06-30' }))).rejects.toMatchObject(
      { status: 403 },
    )
    expect(mockRequireOwnedPlan).not.toHaveBeenCalled()
  })

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

  it('passes the plan and date to the generation service', async () => {
    const plan = { id: 1, userId: 1 }
    mockRequireOwnedPlan.mockResolvedValueOnce(plan)
    mockRecalculatePlanDay.mockResolvedValueOnce(2)
    const res = await POST(makeEvent({ date: '2026-06-30' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ filled: 2 })
    expect(mockRecalculatePlanDay).toHaveBeenCalledWith(plan, 1, '2026-06-30')
  })

  it('reports filled: 0 when the day has no empty slots', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockRecalculatePlanDay.mockResolvedValueOnce(0)
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
