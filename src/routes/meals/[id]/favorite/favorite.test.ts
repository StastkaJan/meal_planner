import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn(),
  delete: vi.fn().mockReturnThis(),
}))

vi.mock('$lib/db', () => ({ db: mockDb }))

import { PUT } from './+server'

function makeEvent(body: object, id = '1', userId = 1) {
  return {
    params: { id },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('PUT /meals/:id/favorite', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    await expect(
      PUT({ params: { id: '1' }, locals: {} } as any),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('returns 404 for a meal not visible to the user', async () => {
    mockDb.limit.mockResolvedValueOnce([])
    await expect(PUT(makeEvent({ favorite: true }))).rejects.toMatchObject({
      status: 404,
    })
  })

  it('inserts a favorite row when favorite: true', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    const res = await PUT(makeEvent({ favorite: true }))
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.values).toHaveBeenCalledWith({ userId: 1, mealId: 1 })
    expect(res.status).toBe(204)
  })

  it('deletes the favorite row when favorite: false', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 1 }])
    const res = await PUT(makeEvent({ favorite: false }))
    expect(mockDb.delete).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })
})
