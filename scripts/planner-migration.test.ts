import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

describe('consolidated planner migration', () => {
  it.each([
    ['before planner changes', 1788602623381, true],
    ['former 0026 applied', 1788877061686, true],
    ['former 0027 applied', 1788892202558, false],
  ] as const)(
    'handles %s without rewriting migration history',
    async (_state, timestamp, applies) => {
      const dialect = new PgDialect()
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
      }).filter((migration) => migration.folderMillis <= 1788892202558)
      const execute = vi.fn(async (_query: SQL) => [])
      const session = {
        execute: vi.fn(async () => []),
        all: vi.fn(async () => [{ created_at: timestamp }]),
        transaction: async (
          run: (tx: { execute: typeof execute }) => Promise<void>,
        ) => run({ execute }),
      }
      await dialect.migrate(
        migrations,
        session as unknown as Parameters<PgDialect['migrate']>[1],
        { migrationsFolder: '' },
      )
      const statements = execute.mock.calls.map(([query]) =>
        dialect.sqlToQuery(query),
      )
      if (!applies) {
        expect(statements).toEqual([])
        return
      }
      expect(
        statements.filter(({ sql }) =>
          sql.includes('ADD COLUMN IF NOT EXISTS'),
        ),
      ).toHaveLength(4)
      expect(
        statements.filter(({ sql }) =>
          sql.includes('CREATE TABLE IF NOT EXISTS "saved_extras"'),
        ),
      ).toHaveLength(1)
      expect(statements.at(-1)?.params[1]).toBe(1788892202558)
    },
  )
})
