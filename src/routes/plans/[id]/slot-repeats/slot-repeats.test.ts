import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn(),
  delete: vi.fn().mockReturnThis(),
  where: vi.fn(),
}))

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())

vi.mock('$lib/db', () => ({ db: mockDb }))
vi.mock('$lib/server/plans', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
}))

import { PUT } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('PUT /plans/:id/slot-repeats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(
      PUT(makeEvent({ mealType: 'lunch', groupBreaks: null })),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('rejects an invalid mealType with 400', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      PUT(makeEvent({ mealType: 'brunch', groupBreaks: null })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects groupBreaks that is not 6 booleans', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      PUT(makeEvent({ mealType: 'lunch', groupBreaks: [true, false] })),
    ).rejects.toMatchObject({ status: 400 })

    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    await expect(
      PUT(
        makeEvent({
          mealType: 'lunch',
          groupBreaks: [1, 0, 1, 0, 1, 0],
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('deletes the row and returns 204 when groupBreaks is null', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    const res = await PUT(makeEvent({ mealType: 'lunch', groupBreaks: null }))
    expect(res.status).toBe(204)
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('upserts the row and returns 204 when groupBreaks is provided', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    const groupBreaks = [false, true, false, true, false, false]
    const res = await PUT(makeEvent({ mealType: 'lunch', groupBreaks }))
    expect(res.status).toBe(204)
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.values).toHaveBeenCalledWith({
      planId: 1,
      mealType: 'lunch',
      groupBreaks,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not authenticated'), { status: 401 }),
    )
    await expect(
      PUT({
        params: { id: '1' },
        request: {
          json: () => Promise.resolve({ mealType: 'lunch', groupBreaks: null }),
        },
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 401 })
  })
})
