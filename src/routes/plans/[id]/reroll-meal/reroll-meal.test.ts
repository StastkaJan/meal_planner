import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireOwnedPlan = vi.hoisted(() => vi.fn())
const requirePro = vi.hoisted(() => vi.fn())
const rerollPlanMeal = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/guards', () => ({ requireOwnedPlan, requirePro }))
vi.mock('$lib/server/services/plan-generation', () => ({ rerollPlanMeal }))
import { POST } from './+server'

const plan = { id: 4, userId: 7, mealSlots: ['dinner'] }
const event = (body: unknown = { date: '2026-09-01', mealType: 'dinner' }) =>
  ({
    params: { id: '4' },
    locals: {},
    request: { json: async () => body },
  }) as any

describe('POST /plans/:id/reroll-meal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireOwnedPlan.mockResolvedValue(plan)
    rerollPlanMeal.mockResolvedValue({ changed: true })
  })

  it('passes the selected slot and default filters to generation', async () => {
    expect(await (await POST(event())).json()).toEqual({ changed: true })
    expect(rerollPlanMeal).toHaveBeenCalledExactlyOnceWith(
      plan,
      '2026-09-01',
      'dinner',
      {
        favoritesOnly: false,
        myRecipesOnly: false,
      },
    )
  })

  it.each([
    null,
    {},
    { date: 'bad', mealType: 'dinner' },
    { date: '2026-09-01', mealType: 'lunch' },
    { date: '2026-09-01', mealType: 'dinner', favoritesOnly: 'true' },
  ])('rejects invalid input: %j', async (body) => {
    await expect(POST(event(body))).rejects.toMatchObject({ status: 400 })
    expect(rerollPlanMeal).not.toHaveBeenCalled()
  })

  it('requires Pro', async () => {
    requirePro.mockImplementationOnce(() => {
      throw { status: 403 }
    })
    await expect(POST(event())).rejects.toMatchObject({ status: 403 })
    expect(rerollPlanMeal).not.toHaveBeenCalled()
  })

  it('requires ownership', async () => {
    requireOwnedPlan.mockRejectedValueOnce({ status: 404 })
    await expect(POST(event())).rejects.toMatchObject({ status: 404 })
    expect(rerollPlanMeal).not.toHaveBeenCalled()
  })
})
