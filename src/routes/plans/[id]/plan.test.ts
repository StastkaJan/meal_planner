import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireOwnedPlan = vi.hoisted(() => vi.fn())
const updatePlanPortions = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({ requireOwnedPlan }))
vi.mock('$lib/server/repositories/plans', () => ({
  deletePlan: vi.fn(),
  getPlanDetail: vi.fn(),
  updatePlanPortions,
}))

import { PATCH } from './+server'

const event = (portions: unknown) =>
  ({
    params: { id: '1' },
    request: { json: () => Promise.resolve({ portions }) },
    locals: { user: { id: 1 } },
  }) as any

describe('PATCH /plans/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireOwnedPlan.mockResolvedValue({ id: 1 })
  })

  it.each([0, 1.5, 101, '2'])('rejects invalid portions: %s', async (value) => {
    await expect(PATCH(event(value))).rejects.toMatchObject({ status: 400 })
    expect(updatePlanPortions).not.toHaveBeenCalled()
  })

  it('updates portions on an owned plan', async () => {
    updatePlanPortions.mockResolvedValue({ id: 1, portions: 4 })
    const response = await PATCH(event(4))
    expect(await response.json()).toMatchObject({ portions: 4 })
    expect(updatePlanPortions).toHaveBeenCalledWith(1, 4)
  })
})
