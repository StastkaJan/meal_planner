import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => {
  const db: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn((cb: (tx: any) => unknown) => cb(db)),
  }
  return db
})

vi.mock('$lib/db', () => ({ db: mockDb }))

const syncMealIngredients = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/meals', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  syncMealIngredients,
}))

import { POST } from './+server'

function makeEvent(body: object, userId = 1) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('POST /meals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects unauthenticated requests', async () => {
    await expect(
      POST({
        request: { json: () => Promise.resolve({}) },
        locals: {},
      } as any),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('rejects a missing name', async () => {
    await expect(POST(makeEvent({}))).rejects.toMatchObject({ status: 400 })
  })

  it('creates a meal and syncs its ingredients within a transaction', async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: 1, name: 'Soup', ingredients: ['2 carrots'] },
    ])
    const res = await POST(
      makeEvent({ name: 'Soup', ingredients: ['2 carrots'] }),
    )
    expect(res.status).toBe(201)
    expect(mockDb.transaction).toHaveBeenCalled()
    expect(syncMealIngredients).toHaveBeenCalledWith(mockDb, 1, ['2 carrots'])
  })
})
