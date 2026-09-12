import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

describe('consolidated ingredient migration', () => {
  it.each([
    ['before the PR', 1788892202558, true],
    ['former catalogue migration applied', 1789133039998, true],
    ['both former migrations applied', 1789211278498, false],
  ] as const)('handles %s', async (_state, timestamp, applies) => {
    const dialect = new PgDialect()
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    }).filter(
      (migration) =>
        migration.folderMillis > 1788892202558 &&
        migration.folderMillis <= 1789211278498,
    )
    expect(migrations).toHaveLength(1)
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
    expect(statements[0].sql).toContain(
      "IF to_regclass('public.user_ingredients') IS NULL",
    )
    expect(statements[1].sql).toContain(
      "IF to_regclass('public.ingredient_translations') IS NULL",
    )
    expect(statements.at(-1)?.params[1]).toBe(1789211278498)
  })
})
