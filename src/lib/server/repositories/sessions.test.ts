import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}))

vi.mock('$lib/database', () => ({ db }))

import { findSessionUser } from './sessions'

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
