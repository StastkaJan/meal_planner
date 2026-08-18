import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}))

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockUpsertSlot = vi.hoisted(() => vi.fn())
const mockGetSlotMeal = vi.hoisted(() => vi.fn())
const mockSetSlotLeftover = vi.hoisted(() => vi.fn())

vi.mock('$lib/database', () => ({ db: mockDb }))
vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
}))
vi.mock('$lib/server/repositories/plans', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSlotMeal: mockGetSlotMeal,
  setSlotLeftover: mockSetSlotLeftover,
  upsertSlot: mockUpsertSlot,
}))

import { PATCH, PUT } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('PUT /plans/:id/slots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(
      PUT(
        makeEvent({
          date: '2026-06-30',
          mealType: 'lunch',
          mealId: 1,
        }),
      ),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('rejects an invalid date with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      PUT(
        makeEvent({
          date: 'not-a-date',
          mealType: 'lunch',
          mealId: 1,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('deletes the slot and returns 204 when mealId is null', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    const res = await PUT(
      makeEvent({
        date: '2026-06-30',
        mealType: 'lunch',
        mealId: null,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockUpsertSlot).toHaveBeenCalledWith(1, '2026-06-30', 'lunch', null)
  })

  it('upserts the slot and returns 204 when mealId is provided', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockDb.limit.mockResolvedValueOnce([{ id: 5, allowedSlots: [] }])
    const res = await PUT(
      makeEvent({
        date: '2026-06-30',
        mealType: 'lunch',
        mealId: 5,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockUpsertSlot).toHaveBeenCalledWith(1, '2026-06-30', 'lunch', 5)
  })

  it('rejects a meal not allowed for the slot type with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockDb.limit.mockResolvedValueOnce([{ id: 5, allowedSlots: ['breakfast'] }])
    await expect(
      PUT(
        makeEvent({
          date: '2026-06-30',
          mealType: 'lunch',
          mealId: 5,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect(mockUpsertSlot).not.toHaveBeenCalled()
  })

  it('rejects invalid mealType with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      PUT(
        makeEvent({
          date: '2026-06-30',
          mealType: 'brunch',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not authenticated'), { status: 401 }),
    )
    await expect(
      PUT({
        params: { id: '1' },
        request: {
          json: () =>
            Promise.resolve({
              date: '2026-06-30',
              mealType: 'lunch',
              mealId: null,
            }),
        },
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 401 })
  })
})

describe('PATCH /plans/:id/slots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireOwnedPlan.mockResolvedValue({ id: 1, userId: 1 })
  })

  it('marks a slot as leftovers from an earlier matching meal', async () => {
    mockGetSlotMeal
      .mockResolvedValueOnce({ mealId: 5 })
      .mockResolvedValueOnce({ mealId: 5 })
    const source = { date: '2026-06-29', mealType: 'lunch' }

    const response = await PATCH(
      makeEvent({ date: '2026-06-30', mealType: 'dinner', source }),
    )

    expect(response.status).toBe(204)
    expect(mockSetSlotLeftover).toHaveBeenCalledWith(
      1,
      '2026-06-30',
      'dinner',
      source,
    )
  })

  it('rejects a source that is not earlier', async () => {
    mockGetSlotMeal.mockResolvedValueOnce({ mealId: 5 })
    await expect(
      PATCH(
        makeEvent({
          date: '2026-06-30',
          mealType: 'lunch',
          source: { date: '2026-06-30', mealType: 'breakfast' },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect(mockSetSlotLeftover).not.toHaveBeenCalled()
  })

  it('rejects a source containing a different meal', async () => {
    mockGetSlotMeal
      .mockResolvedValueOnce({ mealId: 5 })
      .mockResolvedValueOnce({ mealId: 6 })
    await expect(
      PATCH(
        makeEvent({
          date: '2026-06-30',
          mealType: 'lunch',
          source: { date: '2026-06-29', mealType: 'lunch' },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect(mockSetSlotLeftover).not.toHaveBeenCalled()
  })

  it('clears a leftover link', async () => {
    mockGetSlotMeal.mockResolvedValueOnce({ mealId: 5 })
    const response = await PATCH(
      makeEvent({ date: '2026-06-30', mealType: 'lunch', source: null }),
    )
    expect(response.status).toBe(204)
    expect(mockSetSlotLeftover).toHaveBeenCalledWith(
      1,
      '2026-06-30',
      'lunch',
      null,
    )
  })
})
