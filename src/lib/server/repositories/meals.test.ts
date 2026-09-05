import { beforeEach, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const db = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([]),
}))
vi.mock('$lib/database', () => ({ db }))
import { listMealPickerItems } from './meals'

beforeEach(() => vi.clearAllMocks())
it('bounds picker SQL and filters visibility, ownership, slot, and literal search', async () => {
  await listMealPickerItems(7, 'cs', {
    mealType: 'lunch',
    mine: true,
    query: '100% soup',
    page: 3,
  })
  const query = new PgDialect().sqlToQuery(db.where.mock.calls[0][0])
  expect(query.sql).toContain('"meals"."archived_at" is null')
  expect(query.sql).toContain('"meals"."user_id" is null or')
  expect(query.sql).toContain('cardinality("meals"."allowed_slots") = 0')
  expect(query.sql).toContain('position(lower(')
  expect(query.params).toEqual([7, 7, 'lunch', '100% soup'])
  expect(db.limit).toHaveBeenCalledWith(31)
  expect(db.offset).toHaveBeenCalledWith(60)
})
