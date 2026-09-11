import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { bonusItems, slotLeftovers, weekSlots } from '$lib/database/schema'

const db = vi.hoisted(() => ({ transaction: vi.fn(), select: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import { clearPlan, replaceSingleSlot, upsertSlot, copyWeek } from './plans'

const dialect = new PgDialect()

describe('planner clearing and replacement persistence', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each(['2026-09-02', '2026-09-08'])(
    'clears slots and extras atomically with scope %s',
    async (end) => {
      const where = vi.fn().mockResolvedValue(undefined)
      const tx = { delete: vi.fn(() => ({ where })) }
      db.transaction.mockImplementationOnce((run) => run(tx))
      await clearPlan(4, '2026-09-01', end)
      expect(tx.delete.mock.calls).toEqual([[weekSlots], [bonusItems]])
      const queries = where.mock.calls.map(([condition]) =>
        dialect.sqlToQuery(condition),
      )
      expect(queries.map((query) => query.params)).toEqual([
        [4, '2026-09-01', end],
        [4, '2026-09-01', end],
      ])
      for (const query of queries) {
        expect(query.sql).toContain('"plan_id" =')
        expect(query.sql).toContain('"date" >=')
        expect(query.sql).toContain('"date" <')
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
