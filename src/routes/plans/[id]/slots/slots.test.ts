import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockReturnThis(),
}))

vi.mock('$lib/db', () => ({ db: mockDb }))

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
    mockDb.limit.mockResolvedValueOnce([])
    await expect(
      PUT(
        makeEvent({
          week: '2026-06-30',
          dayOfWeek: 0,
          mealType: 'lunch',
          mealId: 1,
        }),
      ),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('deletes the slot and returns 204 when mealId is null', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    const res = await PUT(
      makeEvent({
        week: '2026-06-30',
        dayOfWeek: 0,
        mealType: 'lunch',
        mealId: null,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('upserts the slot and returns 204 when mealId is provided', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 1 }]) // plan ownership
      .mockResolvedValueOnce([{ id: 5 }]) // meal visibility
    const res = await PUT(
      makeEvent({
        week: '2026-06-30',
        dayOfWeek: 0,
        mealType: 'lunch',
        mealId: 5,
      }),
    )
    expect(res.status).toBe(204)
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.delete).not.toHaveBeenCalled()
  })

  it('rejects invalid week format with 400', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    await expect(
      PUT(
        makeEvent({
          week: 'not-a-date',
          dayOfWeek: 0,
          mealType: 'lunch',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects invalid dayOfWeek with 400', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    await expect(
      PUT(
        makeEvent({
          week: '2026-06-30',
          dayOfWeek: 7,
          mealType: 'lunch',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects non-integer dayOfWeek with 400', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    await expect(
      PUT(
        makeEvent({
          week: '2026-06-30',
          dayOfWeek: 1.5,
          mealType: 'lunch',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects invalid mealType with 400', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    await expect(
      PUT(
        makeEvent({
          week: '2026-06-30',
          dayOfWeek: 0,
          mealType: 'brunch',
          mealId: null,
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('returns 401 when unauthenticated', async () => {
    await expect(
      PUT({
        params: { id: '1' },
        request: {
          json: () =>
            Promise.resolve({
              week: '2026-06-30',
              dayOfWeek: 0,
              mealType: 'lunch',
              mealId: null,
            }),
        },
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 401 })
  })
})
