import { expect, it, vi } from 'vitest'
import { migrateProduction } from './migrate-production'

it('takes a backup before applying migrations', () => {
  const run = vi.fn()

  migrateProduction(run)

  expect(run.mock.calls[0][1]).toContain('backup')
  expect(run.mock.calls[1][1]).toContain('migrate')
})

it('does not migrate when the backup fails', () => {
  const run = vi.fn(() => {
    throw new Error('backup failed')
  })

  expect(() => migrateProduction(run)).toThrow('backup failed')
  expect(run).toHaveBeenCalledOnce()
})
