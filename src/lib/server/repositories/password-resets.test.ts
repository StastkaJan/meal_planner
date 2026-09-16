import { beforeEach, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { passwordResets, sessions, users } from '$lib/database/schema'
const db = vi.hoisted(() => ({ transaction: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import { consumePasswordReset, savePasswordReset } from './password-resets'

function transaction(responses: unknown[]) {
  const query: any = {}
  for (const method of [
    'select',
    'from',
    'where',
    'for',
    'insert',
    'values',
    'onConflictDoUpdate',
    'delete',
    'returning',
    'update',
    'set',
  ])
    query[method] = vi.fn(() => query)
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(responses.shift()).then(resolve)
  db.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
    callback(query),
  )
  return query
}
beforeEach(() => vi.clearAllMocks())

it('atomically consumes an unexpired token, changes the password, and revokes all sessions', async () => {
  const tx = transaction([
    [{ userId: 1, passwordHash: 'old' }],
    [{ id: 1, passwordHash: 'old' }],
    [{ userId: 1 }],
    [],
    [],
  ])
  expect(await consumePasswordReset('digest', 'new')).toBe(true)
  expect(tx.for).toHaveBeenCalledWith('update')
  expect(tx.delete.mock.calls).toEqual([[passwordResets], [sessions]])
  expect(tx.update).toHaveBeenCalledWith(users)
  expect(tx.set).toHaveBeenCalledWith({ passwordHash: 'new' })
  const sql = drizzle
    .mock()
    .delete(passwordResets)
    .where(tx.where.mock.calls[2][0])
    .toSQL()
  expect(sql.sql).toContain('"password_resets"."token_hash" = $1')
  expect(sql.sql).toContain('"password_resets"."expires_at" > $2')
  expect(sql.params[0]).toBe('digest')
})

it.each([
  ['unknown token', [[]]],
  ['deleted account', [[{ userId: 1, passwordHash: 'old' }], []]],
  [
    'changed password',
    [
      [{ userId: 1, passwordHash: 'old' }],
      [{ id: 1, passwordHash: 'changed' }],
    ],
  ],
  [
    'expired or consumed token',
    [
      [{ userId: 1, passwordHash: 'old' }],
      [{ id: 1, passwordHash: 'old' }],
      [],
    ],
  ],
])('leaves the account unchanged for %s', async (_name, responses) => {
  const tx = transaction([...responses])
  expect(await consumePasswordReset('digest', 'new')).toBe(false)
  expect(tx.update).not.toHaveBeenCalled()
  expect(tx.delete).not.toHaveBeenCalledWith(sessions)
})

it('replaces the previous reset under an account lock', async () => {
  const tx = transaction([[{ passwordHash: 'old' }], []])
  expect(await savePasswordReset(1, 'old', 'digest', new Date())).toBe(true)
  expect(tx.for).toHaveBeenCalledWith('update')
  expect(tx.onConflictDoUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ target: passwordResets.userId }),
  )
})

it('does not issue a reset after a concurrent password change', async () => {
  const tx = transaction([[{ passwordHash: 'new' }]])
  expect(await savePasswordReset(1, 'old', 'digest', new Date())).toBe(false)
  expect(tx.insert).not.toHaveBeenCalled()
})
