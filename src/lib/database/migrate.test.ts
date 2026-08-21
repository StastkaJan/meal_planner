import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const pool = { end: vi.fn() }
  const db = {}

  return {
    pool,
    db,
    Pool: vi.fn(function () {
      return pool
    }),
    drizzle: vi.fn(() => db),
    migrate: vi.fn(),
  }
})

vi.mock('pg', () => ({ default: { Pool: mocks.Pool } }))
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: mocks.drizzle }))
vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: mocks.migrate,
}))

describe('production migration script', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('runs migrations and closes the pool', async () => {
    await import('./migrate')

    expect(mocks.migrate).toHaveBeenCalledWith(mocks.db, {
      migrationsFolder: './drizzle',
    })
    expect(mocks.pool.end).toHaveBeenCalledOnce()
  })

  it('closes the pool when migration fails', async () => {
    mocks.migrate.mockRejectedValueOnce(new Error('migration failed'))

    await expect(import('./migrate')).rejects.toThrow('migration failed')
    expect(mocks.pool.end).toHaveBeenCalledOnce()
  })
})
