import { getTableName } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.mock('../server/repositories/meals', () => ({
  syncMealIngredients: vi.fn(),
}))
import { syncMealIngredients } from '../server/repositories/meals'
import { verifyPassword } from '../server/services/auth'
import {
  assertPreviewSeedTarget,
  DEMO_PASSWORD,
  DEMO_USERS,
  seedPreviewAccounts,
} from './preview-seed'

const shared = [
  'Oatmeal with Berries',
  'Lentil Soup',
  'Grilled Chicken Salad',
  'Apple and Almond Butter',
  'Greek Yogurt with Honey',
  'Salmon with Sweet Potato',
].map((name, i) => ({
  id: i + 1,
  userId: null,
  name,
  sourceLocale: 'en',
  calories: 350,
  servings: 1,
  allowedSlots: [],
  archivedAt: null,
  description: 'A sample recipe.',
  instructions: 'Cook and serve.',
}))

// Capture seed writes; actual PostgreSQL constraints remain covered by migration/E2E CI.
function fixture() {
  const rows: Record<string, any[]> = {}
  let id = 100
  const tx: any = {
    insert: vi.fn((table) => {
      const name = getTableName(table)
      return {
        values: (values: any) => {
          const incoming = Array.isArray(values) ? values : [values]
          const execute = () => {
            rows[name] ??= []
            const inserted = incoming
              .filter(
                (row) =>
                  name !== 'users' ||
                  !rows[name].some(({ email }) => email === row.email),
              )
              .map((row) => ({ id: id++, ...row }))
            rows[name].push(...inserted)
            return inserted
          }
          const query: any = {
            onConflictDoNothing: () => query,
            returning: async () => execute(),
            then: (resolve: (value: unknown) => unknown) =>
              Promise.resolve(execute()).then(resolve),
          }
          return query
        },
      }
    }),
    select: () => {
      let tableName: string
      const query: any = {
        from: (table: Parameters<typeof getTableName>[0]) => {
          tableName = getTableName(table)
          return query
        },
        where: () => query,
        innerJoin: () => query,
        orderBy: async () =>
          tableName === 'meals'
            ? shared
            : [
                { mealId: 1, name: 'Rolled oats', qty: '1', unit: 'cup' },
                { mealId: 2, name: 'Lentils', qty: '1', unit: 'cup' },
                { mealId: 3, name: 'Chicken', qty: '200', unit: 'g' },
              ],
      }
      return query
    },
  }
  const db = {
    transaction: vi.fn(async (task) => task(tx)),
  } as unknown as Parameters<typeof seedPreviewAccounts>[0]
  return { db, rows, tx }
}

beforeEach(() => vi.clearAllMocks())

describe('preview seed', () => {
  it('requires explicit preview identity and an isolated Compose database', () => {
    const database = 'postgresql://mealplan:demo@db:5432/mealplan'
    expect(() => assertPreviewSeedTarget({ DATABASE_URL: database })).toThrow()
    expect(() =>
      assertPreviewSeedTarget({
        PREVIEW_ID: 'production',
        DATABASE_URL: database,
      }),
    ).toThrow()
    expect(() =>
      assertPreviewSeedTarget({
        PREVIEW_ID: 'pr-42',
        DATABASE_URL: 'postgresql://mealplan:demo@production:5432/mealplan',
      }),
    ).toThrow()
    expect(() =>
      assertPreviewSeedTarget({ PREVIEW_ID: 'pr-42', DATABASE_URL: database }),
    ).not.toThrow()
    const runner = readFileSync(
      new URL('./seed-preview.ts', import.meta.url),
      'utf8',
    )
    expect(runner.indexOf('assertPreviewSeedTarget(process.env)')).toBeLessThan(
      runner.indexOf("await import('./seed.js')"),
    )
  })

  it('creates every role with usable credentials, legal notices, and scoped data', async () => {
    const { db, rows } = fixture()
    expect(await seedPreviewAccounts(db, '2026-09-05')).toBe(4)
    expect(
      rows.users.map(({ email, isAdmin, isPro }) => ({
        email,
        isAdmin,
        isPro,
      })),
    ).toEqual(DEMO_USERS.map(({ locale: _locale, ...user }) => user))
    for (const user of rows.users) {
      expect(await verifyPassword(DEMO_PASSWORD, user.passwordHash)).toBe(true)
      expect(
        rows.legal_document_events.filter(({ userId }) => userId === user.id),
      ).toHaveLength(2)
      const own = rows.meals.filter(({ userId }) => userId === user.id)
      expect(own).toHaveLength(3)
      expect(own.filter(({ archivedAt }) => archivedAt === null)).toHaveLength(
        2,
      )
      expect(own[0].allowedSlots).toEqual(['breakfast'])
      expect(
        rows.user_settings.find(({ userId }) => userId === user.id),
      ).toBeDefined()
      const plan = rows.plans.find(({ userId }) => userId === user.id)
      expect(plan.weekStart).toBe('2026-08-31')
      const visible = new Set(
        [...shared, ...own.filter(({ archivedAt }) => !archivedAt)].map(
          ({ id }) => id,
        ),
      )
      const slots = rows.week_slots.filter(({ planId }) => planId === plan.id)
      expect(slots).toHaveLength(70)
      expect(slots.every(({ mealId }) => visible.has(mealId))).toBe(true)
      expect(
        rows.meal_favorites
          .filter(({ userId }) => userId === user.id)
          .every(({ mealId }) => visible.has(mealId)),
      ).toBe(true)
    }
    expect(vi.mocked(syncMealIngredients)).toHaveBeenCalledTimes(12)
    expect(rows.meal_translations).toHaveLength(4)
    expect(rows.bonus_items).toHaveLength(8)
    expect(rows.recipe_imports.map(({ status }) => status)).toEqual([
      'pending',
      'approved',
      'rejected',
    ])
    expect(rows.slot_leftovers ?? []).toHaveLength(0)
  })

  it('preserves existing demo passwords, roles, and edits on repeated seeding', async () => {
    const { db, rows } = fixture()
    await seedPreviewAccounts(db, '2026-09-05')
    rows.users[0].passwordHash = 'changed-password'
    rows.users[0].isPro = true
    rows.meals[0].name = 'Edited recipe'
    rows.plans[0].portions = 4
    const before = structuredClone(rows)
    expect(await seedPreviewAccounts(db, '2026-09-12')).toBe(0)
    expect(rows).toEqual(before)
  })
})
