import { beforeEach, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const db = vi.hoisted(() => ({ select: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import { resolveIngredient } from './ingredients'

beforeEach(() => vi.clearAllMocks())

it('normalizes whitespace in custom-name lookup SQL', async () => {
  const row = {
    id: 2,
    name: 'My spice',
    nameCs: null,
    aliases: [],
    isCatalog: false,
  }
  const chain: any = {
    from: () => chain,
    where: vi.fn(() => chain),
    orderBy: () => Promise.resolve([]),
    limit: () => Promise.resolve([row]),
  }
  const tx: any = {
    select: () => chain,
    execute: vi.fn(),
    insert: () => ({ values: () => ({ onConflictDoNothing: vi.fn() }) }),
  }
  await expect(resolveIngredient(tx, '  My   spice ', 42)).resolves.toEqual(row)
  const query = new PgDialect().sqlToQuery(chain.where.mock.calls.at(-1)[0])
  expect(query.sql).toContain("'\\s+'")
  expect(query.params).toEqual(['my spice'])
})

it('rejects a private ingredient ID absent from the actor catalogue', async () => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () =>
      Promise.resolve([{ id: 1, name: 'Tomato', nameCs: null, aliases: [] }]),
  }
  const tx: any = { select: () => chain, execute: vi.fn(), delete: vi.fn() }
  await expect(
    resolveIngredient(tx, 'Other user spice', 42, 9),
  ).rejects.toThrow('Unknown ingredient')
  expect(tx.execute).not.toHaveBeenCalled()
})
