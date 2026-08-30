import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('$lib/database', () => ({ db }))

import { getAccountExport } from './accounts'

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
