import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}))

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockUpsertSlot = vi.hoisted(() => vi.fn())

vi.mock('$lib/db', () => ({ db: mockDb }))
vi.mock('$lib/server/plans', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  upsertSlot: mockUpsertSlot,
  validDateStr: (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      throw Object.assign(new Error('Invalid date'), { status: 400 })
    return d
  },
}))

import { PUT } from './+server'

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
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'simple',
    })
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
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'simple',
    })
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
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'simple',
    })
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
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'simple',
    })
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

  it('ignores allowedSlots restrictions for a calendar-mode plan', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'calendar',
    })
    mockDb.limit.mockResolvedValueOnce([{ id: 5, allowedSlots: ['breakfast'] }])
    const res = await PUT(
      makeEvent({
        date: '2026-06-30',
        mealType: '18:00',
        mealId: 5,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockUpsertSlot).toHaveBeenCalledWith(1, '2026-06-30', '18:00', 5)
  })

  it('rejects invalid mealType with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'simple',
    })
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

  it('accepts an HH:MM mealType for a calendar-mode plan', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'calendar',
    })
    mockDb.limit.mockResolvedValueOnce([{ id: 5 }])
    const res = await PUT(
      makeEvent({
        date: '2026-06-30',
        mealType: '08:30',
        mealId: 5,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockUpsertSlot).toHaveBeenCalledWith(1, '2026-06-30', '08:30', 5)
  })

  it('rejects an invalid time mealType for a calendar-mode plan', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'calendar',
    })
    await expect(
      PUT(
        makeEvent({
          date: '2026-06-30',
          mealType: '25:99',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects a named mealType for a calendar-mode plan', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mode: 'calendar',
    })
    await expect(
      PUT(
        makeEvent({
          date: '2026-06-30',
          mealType: 'lunch',
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
