import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireOwnedPlan = vi.hoisted(() => vi.fn())
const updatePlanPortions = vi.hoisted(() => vi.fn())
const updatePlanMealSlots = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({ requireOwnedPlan }))
vi.mock('$lib/server/repositories/plans', () => ({
  deletePlan: vi.fn(),
  getPlanDetail: vi.fn(),
  updatePlanMealSlots,
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

  it('normalizes and updates configured meal slots', async () => {
    updatePlanMealSlots.mockResolvedValue({
      id: 1,
      mealSlots: ['lunch', 'second_breakfast'],
    })
    const response = await PATCH({
      ...event(1),
      request: {
        json: () =>
          Promise.resolve({ mealSlots: ['lunch', 'Second breakfast'] }),
      },
    } as any)
    expect(await response.json()).toMatchObject({
      mealSlots: ['lunch', 'second_breakfast'],
    })
    expect(updatePlanMealSlots).toHaveBeenCalledWith(1, [
      'lunch',
      'second_breakfast',
    ])
  })

  it('rejects an empty meal slot list', async () => {
    await expect(
      PATCH({
        ...event(1),
        request: { json: () => Promise.resolve({ mealSlots: [] }) },
      } as any),
    ).rejects.toMatchObject({ status: 400 })
    expect(updatePlanMealSlots).not.toHaveBeenCalled()
  })
})
