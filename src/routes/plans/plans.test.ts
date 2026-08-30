import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}))

vi.mock('$lib/database', () => ({ db: mockDb }))
vi.mock('$lib/server/repositories/households', () => ({
  getHouseholdAccess: vi.fn().mockResolvedValue(null),
}))

import { POST } from './+server'

function makeEvent(body: object, userId = 1) {
  return {
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('POST /plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.orderBy.mockResolvedValue([])
  })

  it('rejects a second plan for the same user', async () => {
    mockDb.orderBy.mockResolvedValueOnce([{ id: 1, userId: 1 }])

    await expect(POST(makeEvent({}))).rejects.toMatchObject({ status: 409 })
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('creates a plan without duplicating user preferences', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 1 }])
    await POST(makeEvent({}))
    const inserted = mockDb.values.mock.calls[0][0]
    expect(inserted.cuisinePrefs).toEqual([])
    expect(inserted.dietaryRestrictions).toEqual([])
    expect(inserted.userId).toBe(1)
  })

  it('inserts a plan with weekStart snapped to Monday', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 1, weekStart: '2026-06-29' }])
    await POST(makeEvent({}))
    const inserted = mockDb.values.mock.calls[0][0]
    const ws = new Date(inserted.weekStart)
    // Monday = 1 in local, but we stored UTC ISO so check via UTC day
    expect(ws.getUTCDay()).toBe(1) // 1 = Monday
  })

  it('ignores client-supplied weekStart', async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 1, weekStart: '2026-06-29' }])
    await POST(makeEvent({ weekStart: '2026-01-01' }))
    const inserted = mockDb.values.mock.calls[0][0]
    expect(inserted.weekStart).not.toBe('2026-01-01')
  })
})
