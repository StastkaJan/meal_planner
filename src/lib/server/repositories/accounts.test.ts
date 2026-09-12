import { beforeEach, describe, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { PgDialect } from 'drizzle-orm/pg-core'
import { meals, plans } from '$lib/database/schema'

const db = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('$lib/database', () => ({ db }))

import {
  deleteAccount,
  getAccountExport,
  updateUserAdmin,
  updateUserPro,
} from './accounts'

function makeTx(responses: unknown[]) {
  let index = 0
  const query: any = {}
  for (const method of ['select', 'from', 'where', 'innerJoin', 'orderBy']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(responses[index++]).then(resolve)
  return query
}

describe('getAccountExport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('includes translations belonging to personal recipes', async () => {
    const tx = makeTx([
      [{ email: 'cook@example.com' }],
      [],
      [
        {
          id: 7,
          name: 'Soup',
          ingredients: [],
          translations: [
            {
              locale: 'cs',
              name: 'Polévka',
              description: null,
              instructions: null,
            },
          ],
        },
      ],
      [],
      [{ mealIds: [] }],
      [],
      [],
      [{ id: 1, userId: 42, name: 'My coffee', calories: 10 }],
      [{ id: 4, name: 'My spice' }],
    ])
    db.transaction.mockImplementationOnce(
      (callback: (transaction: unknown) => unknown) => callback(tx),
    )

    const result = await getAccountExport(42)
    expect(result.customIngredients).toEqual([{ id: 4, name: 'My spice' }])
    const queryBuilder = drizzle.mock()
    const recipeSql = queryBuilder
      .select(tx.select.mock.calls[2][0])
      .from(meals)
      .toSQL().sql
    expect(recipeSql).toContain(
      '"ingredients"."id" = "meal_ingredients"."ingredient_id"',
    )
    expect(recipeSql).toContain('"meal_ingredients"."meal_id" = "meals"."id"')
    const planSql = queryBuilder
      .select(tx.select.mock.calls[3][0])
      .from(plans)
      .toSQL().sql
    expect(planSql).toContain('"week_slots"."plan_id" = "plans"."id"')
    expect(planSql).toContain('"bonus_items"."plan_id" = "plans"."id"')
    expect(result.savedExtras).toEqual([
      { id: 1, name: 'My coffee', calories: 10 },
    ])

    expect(tx.select).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        ingredients: expect.anything(),
        translations: expect.anything(),
      }),
    )
    expect(tx.select).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        slots: expect.anything(),
        bonusItems: expect.anything(),
        slotRepeats: expect.anything(),
      }),
    )

    expect(result.recipes).toEqual([
      {
        id: 7,
        name: 'Soup',
        ingredients: [],
        translations: [
          {
            locale: 'cs',
            name: 'Polévka',
            description: null,
            instructions: null,
          },
        ],
      },
    ])
  })
})

describe('updateUserAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  function roleTx(admins: { id: number }[], updated: unknown[] = []) {
    const lock: any = {}
    for (const method of ['from', 'where', 'orderBy'])
      lock[method] = vi.fn(() => lock)
    lock.for = vi.fn().mockResolvedValue(admins)

    const update: any = {}
    for (const method of ['set', 'where']) update[method] = vi.fn(() => update)
    update.returning = vi.fn().mockResolvedValue(updated)

    const tx = {
      select: vi.fn(() => lock),
      update: vi.fn(() => update),
    }
    db.transaction.mockImplementationOnce(
      (callback: (transaction: unknown) => unknown) => callback(tx),
    )
    return { tx, lock }
  }

  it('locks admin rows before changing another user role', async () => {
    const user = { id: 8, email: 'cook@example.com', isAdmin: true }
    const { tx, lock } = roleTx([{ id: 7 }], [user])

    await expect(updateUserAdmin(7, 8, true)).resolves.toEqual(user)
    expect(lock.for).toHaveBeenCalledWith('update')
    expect(tx.update).toHaveBeenCalled()
  })

  it('does not mutate when the acting user is no longer an admin', async () => {
    const { tx, lock } = roleTx([{ id: 9 }])

    await expect(updateUserAdmin(7, 8, false)).resolves.toBe(false)
    expect(lock.for).toHaveBeenCalledWith('update')
    expect(tx.update).not.toHaveBeenCalled()
  })
})

describe('updateUserPro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechecks administrator access before changing Pro entitlement', async () => {
    const lock: any = {}
    for (const method of ['from', 'where', 'orderBy'])
      lock[method] = vi.fn(() => lock)
    lock.for = vi.fn().mockResolvedValue([{ id: 7 }])

    const update: any = {}
    for (const method of ['set', 'where']) update[method] = vi.fn(() => update)
    update.returning = vi
      .fn()
      .mockResolvedValue([
        { id: 8, email: 'cook@example.com', isAdmin: false, isPro: true },
      ])
    const tx = {
      select: vi.fn(() => lock),
      update: vi.fn(() => update),
    }
    db.transaction.mockImplementationOnce(
      (callback: (transaction: unknown) => unknown) => callback(tx),
    )

    await expect(updateUserPro(7, 8, true)).resolves.toMatchObject({
      id: 8,
      isPro: true,
    })
    expect(lock.for).toHaveBeenCalledWith('update')
    expect(update.set).toHaveBeenCalledWith({ isPro: true })
  })
})

describe('deleteAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  function deletionTx(
    admins: { id: number }[],
    personal: { id: number }[] = [],
  ) {
    const lock: any = {}
    for (const method of ['from', 'where', 'orderBy'])
      lock[method] = vi.fn(() => lock)
    lock.for = vi.fn().mockResolvedValue(admins)

    const deletion = { where: vi.fn().mockResolvedValue(undefined) }
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(lock)
        .mockReturnValue({
          from: () => ({ where: () => Promise.resolve(personal) }),
        }),
      delete: vi.fn(() => deletion),
      execute: vi.fn().mockResolvedValue(undefined),
    }
    db.transaction.mockImplementationOnce(
      (callback: (transaction: unknown) => unknown) => callback(tx),
    )
    return { tx, lock }
  }

  it('rejects deletion of the final administrator under the admin lock', async () => {
    const { tx, lock } = deletionTx([{ id: 7 }])

    await expect(deleteAccount(7)).resolves.toBe(false)
    expect(lock.for).toHaveBeenCalledWith('update')
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('allows deletion when another administrator remains', async () => {
    const { tx } = deletionTx([{ id: 7 }, { id: 8 }])

    await expect(deleteAccount(7)).resolves.toBe(true)
    expect(tx.delete).toHaveBeenCalled()
  })

  it('binds multiple custom IDs as one array and retains shared ingredient references', async () => {
    const { tx } = deletionTx([{ id: 8 }], [{ id: 2 }, { id: 3 }])
    await deleteAccount(7)
    const query = new PgDialect().sqlToQuery(tx.execute.mock.calls[0][0])
    expect(query.params).toEqual([[2, 3]])
    expect(query.sql).toContain('any($1::int[])')
    expect(query.sql).toContain('not is_catalog')
    expect(query.sql).toContain('not exists (select 1 from user_ingredients')
    expect(query.sql).toContain('not exists (select 1 from meal_ingredients')
  })
})
