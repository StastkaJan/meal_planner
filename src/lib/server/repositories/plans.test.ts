import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { bonusItems, slotLeftovers, weekSlots } from '$lib/database/schema'

const db = vi.hoisted(() => ({ transaction: vi.fn() }))
vi.mock('$lib/database', () => ({ db }))
import { clearPlan, replaceSingleSlot } from './plans'

const dialect = new PgDialect()

describe('planner clearing and replacement persistence', () => {
  beforeEach(() => vi.clearAllMocks())

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
    'replaces only an unchanged slot and cleans leftover links on success: %s',
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
        expect(tx.delete).toHaveBeenCalledExactlyOnceWith(slotLeftovers)
        expect(dialect.sqlToQuery(deleteWhere.mock.calls[0][0]).params).toEqual(
          [4, '2026-09-01', 'dinner', '2026-09-01', 'dinner'],
        )
      } else {
        expect(tx.delete).not.toHaveBeenCalled()
      }
    },
  )
})
