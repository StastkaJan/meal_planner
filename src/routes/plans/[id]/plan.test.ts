import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
}))

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())

vi.mock('$lib/db', () => ({ db: mockDb }))
vi.mock('$lib/server/plans', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
}))

import { PATCH } from './+server'

function makeEvent(body: object, planId = '1', userId = 1) {
  return {
    params: { id: planId },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: userId } },
  } as any
}

describe('PATCH /plans/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(PATCH(makeEvent({ name: 'x' }))).rejects.toMatchObject({
      status: 404,
    })
  })

  it('does not pass userId from request body to db.update', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockDb.returning.mockResolvedValueOnce([{ id: 1, name: 'renamed' }])
    await PATCH(makeEvent({ name: 'renamed', userId: 99 }))
    const patched = mockDb.set.mock.calls[0][0]
    expect(patched.userId).toBeUndefined()
  })

  it('passes whitelisted fields to db.update', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    mockDb.returning.mockResolvedValueOnce([{ id: 1, name: 'renamed' }])
    await PATCH(
      makeEvent({
        name: 'renamed',
        cuisinePrefs: ['Italian'],
        dietaryRestrictions: [],
      }),
    )
    const patched = mockDb.set.mock.calls[0][0]
    expect(patched.name).toBe('renamed')
    expect(patched.cuisinePrefs).toEqual(['Italian'])
  })
})
