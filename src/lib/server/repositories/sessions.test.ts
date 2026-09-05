import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  delete: vi.fn().mockReturnThis(),
}))

vi.mock('$lib/database', () => ({ db }))

import { findSessionUser, pruneExpiredSessions } from './sessions'

it('prunes expired sessions at most hourly and retries failures', async () => {
  const now = new Date('2040-01-01')
  db.where.mockResolvedValueOnce(undefined)
  await pruneExpiredSessions(now)
  expect(db.delete).toHaveBeenCalledTimes(1)
  await pruneExpiredSessions(new Date(now.getTime() + 1))
  expect(db.delete).toHaveBeenCalledTimes(1)
  db.where.mockRejectedValueOnce(new Error('offline'))
  const later = new Date(now.getTime() + 3600000)
  await expect(pruneExpiredSessions(later)).rejects.toThrow('offline')
  db.where.mockResolvedValueOnce(undefined)
  await pruneExpiredSessions(later)
  expect(db.delete).toHaveBeenCalledTimes(3)
})

describe('findSessionUser', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('uses the persisted roles only', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'user@example.com')
    db.limit.mockResolvedValueOnce([
      { id: 1, email: 'user@example.com', isAdmin: false, isPro: true },
    ])

    await expect(findSessionUser('token')).resolves.toEqual({
      id: 1,
      email: 'user@example.com',
      isAdmin: false,
      isPro: true,
    })
  })
})
