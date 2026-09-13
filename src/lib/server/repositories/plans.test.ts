import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { bonusItems, slotLeftovers, weekSlots } from '$lib/database/schema'

const db = vi.hoisted(() => ({ transaction: vi.fn(), select: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import {
  clearPlan,
  replaceSingleSlot,
  upsertSlot,
  copyWeek,
  getShoppingList,
} from './plans'

const dialect = new PgDialect()

it('uses pantry IDs after catalogue renames and falls back to legacy names without IDs', async () => {
  const client = new PGlite()
  const database = drizzle(client)
  db.select.mockImplementation(database.select.bind(database))
  try {
    await client.exec(`
      CREATE TABLE plans (id int, portions int);
      CREATE TABLE week_slots (plan_id int, date date, meal_id int);
      CREATE TABLE meals (id int, servings int);
      CREATE TABLE ingredients (id int, name text);
      CREATE TABLE ingredient_translations (ingredient_id int, locale text, name text);
      CREATE TABLE meal_ingredients (meal_id int, ingredient_id int, qty numeric, unit text);
      INSERT INTO plans VALUES (1, 1);
      INSERT INTO week_slots VALUES (1, '2026-09-14', 1);
      INSERT INTO meals VALUES (1, 1);
      INSERT INTO ingredients VALUES (1, 'Salt');
      UPDATE ingredients SET name = 'Sea salt' WHERE id = 1;
      INSERT INTO ingredients VALUES (2, 'Salt');
      INSERT INTO meal_ingredients VALUES (1, 1, 10, 'g'), (1, 2, 5, 'g');
    `)
    expect(await getShoppingList(1, '2026-09-14', ['Salt'], [1])).toEqual([
      { ingredientId: 2, name: 'Salt', qty: 5, unit: 'g', count: 1 },
    ])
    expect(await getShoppingList(1, '2026-09-14', ['sALt'])).toEqual([
      { ingredientId: 1, name: 'Sea salt', qty: 10, unit: 'g', count: 1 },
    ])
    expect(await getShoppingList(1, '2026-09-14')).toHaveLength(2)
  } finally {
    db.select.mockReset()
    await client.close()
  }
}, 15000)

describe('planner clearing and replacement persistence', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([undefined, '2026-09-01'])(
    'clears slots and extras atomically with scope %s',
    async (date) => {
      const where = vi.fn().mockResolvedValue(undefined)
      const tx = { delete: vi.fn(() => ({ where })) }
      db.transaction.mockImplementationOnce((run) => run(tx))
      await clearPlan(4, date)
      expect(tx.delete.mock.calls).toEqual([[weekSlots], [bonusItems]])
      const queries = where.mock.calls.map(([condition]) =>
        dialect.sqlToQuery(condition),
      )
      expect(queries.map((query) => query.params)).toEqual([
        date ? [4, date] : [4],
        date ? [4, date] : [4],
      ])
      for (const query of queries) {
        expect(query.sql).toContain('"plan_id" =')
        expect(query.sql.includes('"date" =')).toBe(date !== undefined)
      }
      expect(db.transaction).toHaveBeenCalledTimes(1)
    },
  )

  it.each([true, false])(
    'replaces only an unchanged slot: %s',
    async (changed) => {
      const returning = vi
        .fn()
        .mockResolvedValue(changed ? [{ mealId: 12 }] : [])
      const updateWhere = vi.fn((_condition: SQL) => ({ returning }))
      const set = vi.fn(() => ({ where: updateWhere }))
      const deleteWhere = vi.fn().mockResolvedValue(undefined)
      const tx = {
        update: vi.fn(() => ({ set })),
        delete: vi.fn(() => ({ where: deleteWhere })),
      }
      db.transaction.mockImplementationOnce((run) => run(tx))
      expect(await replaceSingleSlot(4, '2026-09-01', 'dinner', 11, 12)).toBe(
        changed,
      )
      expect(tx.update).toHaveBeenCalledWith(weekSlots)
      expect(set).toHaveBeenCalledWith({ mealId: 12 })
      expect(dialect.sqlToQuery(updateWhere.mock.calls[0][0]).params).toEqual([
        4,
        '2026-09-01',
        'dinner',
        11,
      ])
      if (changed) {
        expect(tx.delete).toHaveBeenCalledWith(slotLeftovers)
        const query = dialect.sqlToQuery(deleteWhere.mock.calls[0][0])
        expect(query.params).toEqual([
          4,
          '2026-09-01',
          'dinner',
          '2026-09-01',
          'dinner',
        ])
        expect(query.sql).toContain('"source_date"')
        expect(query.sql).toContain('"source_meal_type"')
        expect(query.sql).toContain(' or ')
      } else {
        expect(tx.delete).not.toHaveBeenCalled()
      }
    },
  )

  it.each(['repeat', 'copy'] as const)(
    'clears both ends of links for exactly the %s destinations in the write transaction',
    async (operation) => {
      const source = [{ date: '2026-08-31', mealType: 'dinner', mealId: 12 }]
      const where = vi.fn(() =>
        operation === 'copy'
          ? Promise.resolve(source)
          : {
              limit: () =>
                Promise.resolve([
                  { groupBreaks: [false, true, true, true, true, true] },
                ]),
            },
      )
      db.select.mockReturnValue({ from: () => ({ where }) })
      const conflict = vi.fn().mockResolvedValue(undefined)
      const values = vi.fn(() => ({ onConflictDoUpdate: conflict }))
      const deleteWhere = vi.fn((_condition: SQL) => Promise.resolve())
      const tx = {
        insert: vi.fn(() => ({ values })),
        delete: vi.fn(() => ({ where: deleteWhere })),
      }
      db.transaction.mockImplementationOnce((run) => run(tx))
      if (operation === 'copy') await copyWeek(4, '2026-08-31', '2026-09-07')
      else await upsertSlot(4, '2026-08-31', 'dinner', 12)
      const dates =
        operation === 'copy' ? ['2026-09-07'] : ['2026-08-31', '2026-09-01']
      expect(values).toHaveBeenCalledWith(
        dates.map((date) => ({
          planId: 4,
          date,
          mealType: 'dinner',
          mealId: 12,
        })),
      )
      expect(tx.delete).toHaveBeenCalledWith(slotLeftovers)
      const query = dialect.sqlToQuery(deleteWhere.mock.calls[0][0])
      expect(query.params).toEqual([
        4,
        ...dates.flatMap((date) => [date, 'dinner', date, 'dinner']),
      ])
      expect(query.sql).toContain('"source_date"')
      expect(query.sql).toContain('"source_meal_type"')
      expect(db.transaction).toHaveBeenCalledTimes(1)
    },
  )
})
