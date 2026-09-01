import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('$lib/database', () => ({ db }))

import { deleteAccount, getAccountExport, updateUserAdmin } from './accounts'

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
      [{ id: 7, userId: 42, name: 'Soup' }],
      [],
      [
        {
          mealId: 7,
          locale: 'cs',
          name: 'Polévka',
          description: null,
          instructions: null,
        },
      ],
      [],
      [],
      [],
      [],
      [],
      [],
    ])
    db.transaction.mockImplementationOnce(
      (callback: (transaction: unknown) => unknown) => callback(tx),
    )

    const result = await getAccountExport(42)

    expect(tx.select).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({
        fiberG: expect.anything(),
        sugarG: expect.anything(),
        saturatedFatG: expect.anything(),
        saltG: expect.anything(),
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

describe('deleteAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  function deletionTx(admins: { id: number }[]) {
    const lock: any = {}
    for (const method of ['from', 'where', 'orderBy'])
      lock[method] = vi.fn(() => lock)
    lock.for = vi.fn().mockResolvedValue(admins)

    const deletion = { where: vi.fn().mockResolvedValue(undefined) }
    const tx = {
      select: vi.fn(() => lock),
      delete: vi.fn(() => deletion),
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
})
