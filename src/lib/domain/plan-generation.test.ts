import { describe, it, expect } from 'vitest'
import {
  filterByPrefs,
  rankByNutrition,
  fillDaySlots,
  optimizeWeekSlots,
  sumNutrition,
  countMealUsage,
} from './plan-generation'

const meals = [
  { id: 1, calories: 100, tags: ['Italian', 'no_gluten'], allowedSlots: [] },
  { id: 2, calories: 400, tags: ['Chinese', 'Vegan'], allowedSlots: [] },
  { id: 3, calories: 700, tags: ['Mediterranean'], allowedSlots: [] },
  { id: 4, calories: 900, tags: [], allowedSlots: [] },
]

describe('filterByPrefs', () => {
  it('filters by cuisinePrefs (OR logic)', () => {
    const result = filterByPrefs(meals, ['Italian'], [])
    expect(result.map((m) => m.id)).toEqual([1])
  })

  it('filters by dietaryRestrictions (AND logic)', () => {
    const result = filterByPrefs(meals, [], ['no_gluten'])
    expect(result.map((m) => m.id)).toEqual([1])
  })

  it('applies both filters together', () => {
    const result = filterByPrefs(meals, ['Chinese', 'Italian'], ['Vegan'])
    expect(result.map((m) => m.id)).toEqual([2]) // Chinese + Vegan
  })

  it('falls back to all meals when nothing matches', () => {
    const result = filterByPrefs(meals, ['Thai'], [])
    expect(result).toEqual(meals)
  })

  it('returns all meals when prefs are empty', () => {
    const result = filterByPrefs(meals, [], [])
    expect(result).toEqual(meals)
  })
})

describe('rankByNutrition', () => {
  const m = (
    id: number,
    calories: number,
    proteinG: number,
    carbsG: number,
    fatG: number,
  ) => ({
    id,
    calories,
    tags: [],
    allowedSlots: [],
    proteinG,
    carbsG,
    fatG,
  })

  it('prioritizes calorie fit over a better macro fit', () => {
    const cands = [m(1, 500, 1, 1, 1), m(2, 300, 25, 30, 12)]
    const ranked = rankByNutrition(cands, 500, {
      proteinG: 25,
      carbsG: 30,
      fatG: 12,
    })
    expect(ranked[0].id).toBe(1)
  })

  it('uses macros to choose between equal-calorie meals', () => {
    const cands = [m(1, 500, 1, 1, 1), m(2, 500, 25, 30, 12)]
    const ranked = rankByNutrition(cands, 500, {
      proteinG: 25,
      carbsG: 30,
      fatG: 12,
    })
    expect(ranked[0].id).toBe(2)
  })

  it('trades a small calorie difference for substantially better variety', () => {
    const cands = [m(1, 500, 25, 30, 12), m(2, 450, 25, 30, 12)]
    expect(
      rankByNutrition(
        cands,
        500,
        { proteinG: 25, carbsG: 30, fatG: 12 },
        new Map([[1, 4]]),
      )[0].id,
    ).toBe(2)
  })
})

describe('fillDaySlots', () => {
  const targets = { calories: 2000, proteinG: 100, carbsG: 200, fatG: 70 }

  it('keeps nutrition ranking with deterministic ties independent of candidate order', () => {
    const candidates = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      calories: (i * 37) % 1000,
      proteinG: i % 30,
      carbsG: i % 50,
      fatG: i % 20,
      tags: [],
      allowedSlots: [],
    }))
    for (const calories of [0, 300, 700]) {
      const budget = { ...targets, calories }
      const usage = new Map([
        [3, 4],
        [7, 10],
      ])
      const best = rankByNutrition(candidates, calories, budget, usage)[0]
      const result = fillDaySlots(
        1,
        '2026-09-07',
        ['lunch'],
        candidates,
        budget,
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        usage,
      )
      expect(result[0].mealId).toBe(best.id)
    }
    const tied = [
      { ...candidates[0], id: 9 },
      { ...candidates[0], id: 1 },
    ]
    expect(
      fillDaySlots(
        1,
        '2026-09-07',
        ['lunch'],
        tied,
        targets,
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        new Map(),
      )[0].mealId,
    ).toBe(1)
  })

  it('fills an empty slot and updates consumed nutrition and usage count', () => {
    const only = [
      {
        id: 1,
        calories: 400,
        tags: [],
        allowedSlots: [],
        proteinG: 20,
        carbsG: 40,
        fatG: 15,
      },
    ]
    const consumed = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    const usageCounts = new Map<number, number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast'],
      only,
      targets,
      consumed,
      usageCounts,
    )

    expect(toInsert).toEqual([
      { planId: 1, date: '2026-07-16', mealType: 'breakfast', mealId: 1 },
    ])
    expect(consumed).toEqual({
      calories: 400,
      proteinG: 20,
      carbsG: 40,
      fatG: 15,
    })
    expect(usageCounts.get(1)).toBe(1)
  })

  it('skips a slot with no allowedSlots-fitting meal, without consuming budget', () => {
    const dinnerOnly = [
      {
        id: 1,
        calories: 400,
        tags: [],
        allowedSlots: ['dinner'],
        proteinG: 20,
        carbsG: 40,
        fatG: 15,
      },
    ]
    const consumed = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    const usageCounts = new Map<number, number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast'],
      dinnerOnly,
      targets,
      consumed,
      usageCounts,
    )

    expect(toInsert).toEqual([])
    expect(consumed).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  })

  it('fills every empty slot, one distinct meal each, in order', () => {
    const twoMeals = [
      {
        id: 1,
        calories: 300,
        tags: [],
        allowedSlots: ['breakfast'],
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
      },
      {
        id: 2,
        calories: 500,
        tags: [],
        allowedSlots: ['lunch'],
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
      },
    ]
    const consumed = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    const usageCounts = new Map<number, number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast', 'lunch'],
      twoMeals,
      targets,
      consumed,
      usageCounts,
    )

    expect(toInsert.map((r) => [r.mealType, r.mealId])).toEqual([
      ['breakfast', 1],
      ['lunch', 2],
    ])
    expect(consumed.calories).toBe(800)
  })

  it('gives snacks smaller budgets and unknown slots a main-meal budget', () => {
    const candidates = [200, 600].map((calories, i) => ({
      id: i + 1,
      calories,
      tags: [],
      allowedSlots: [],
    }))
    const rows = fillDaySlots(
      1,
      '2026-09-07',
      ['morning_snack', 'custom'],
      candidates,
      { calories: 800, proteinG: 0, carbsG: 0, fatG: 0 },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      new Map(),
    )
    expect(rows.map((row) => row.mealId)).toEqual([1, 2])
  })

  it('uses whole-day tolerance for the final slot and avoids same-day and adjacent-day repeats', () => {
    const candidates = [500, 400, 400].map((calories, i) => ({
      id: i + 1,
      calories,
      tags: [],
      allowedSlots: [],
    }))
    const rows = fillDaySlots(
      1,
      '2026-09-07',
      ['dinner'],
      candidates,
      { calories: 2000, proteinG: 0, carbsG: 0, fatG: 0 },
      { calories: 1500, proteinG: 0, carbsG: 0, fatG: 0 },
      new Map([
        [1, 1],
        [2, 1],
        [3, 1],
      ]),
      [
        { date: '2026-09-07', mealId: 1 },
        { date: '2026-09-08', mealId: 2 },
        { date: '2026-09-10', mealId: 3 },
      ],
    )
    expect(rows[0].mealId).toBe(3)
  })

  it('uses seed ties reproducibly without favoring catalogue order', () => {
    const candidates = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      calories: 500,
      tags: [],
      allowedSlots: [],
    }))
    const picks = (pool: typeof candidates) =>
      Array.from(
        { length: 7 },
        (_, day) =>
          fillDaySlots(
            1,
            `2026-09-${String(day + 7).padStart(2, '0')}`,
            ['lunch'],
            pool,
            { calories: 500, proteinG: 0, carbsG: 0, fatG: 0 },
            { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
            new Map(),
          )[0].mealId,
      )
    expect(picks(candidates)).toEqual(picks([...candidates].reverse()))
    expect(new Set(picks(candidates)).size).toBeGreaterThan(1)
  })

  it('fills all slots with a one-recipe pool despite unavoidable repetition and calorie shortfall', () => {
    const rows = fillDaySlots(
      1,
      '2026-09-07',
      ['breakfast', 'lunch', 'dinner'],
      [{ id: 1, calories: 300, tags: [], allowedSlots: [] }],
      targets,
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      new Map([[1, 20]]),
    )
    expect(rows.map((row) => row.mealId)).toEqual([1, 1, 1])
  })
})

describe('countMealUsage', () => {
  it('counts intentional repeat groups once, while independent selections keep accumulating', () => {
    expect(
      countMealUsage([
        { date: '2026-09-07', mealId: 1, group: 'lunch|2026-09-07' },
        { date: '2026-09-08', mealId: 1, group: 'lunch|2026-09-07' },
        { date: '2026-09-09', mealId: 1 },
        { date: '2026-09-09', mealId: 1 },
        { date: '2026-09-09', mealId: null },
      ]).get(1),
    ).toBe(3)
  })
})

describe('sumNutrition', () => {
  it('sums calories and macros across rows, treating null as 0', () => {
    const rows = [
      { calories: 300, proteinG: '10.0', carbsG: '20.0', fatG: '5.0' },
      { calories: null, proteinG: null, carbsG: null, fatG: null },
      { calories: 200, proteinG: '5.0', carbsG: '10.0', fatG: '2.0' },
    ]
    expect(sumNutrition(rows)).toEqual({
      calories: 500,
      proteinG: 15,
      carbsG: 30,
      fatG: 7,
    })
  })

  it('combines weekSlots-shaped and bonusItems-shaped rows via concatenation', () => {
    const slots = [
      { calories: 400, proteinG: '20.0', carbsG: '40.0', fatG: '15.0' },
    ]
    const bonus = [{ calories: 900, proteinG: null, carbsG: null, fatG: null }]
    expect(sumNutrition([...slots, ...bonus]).calories).toBe(1300)
  })

  it('returns all zeros for an empty list', () => {
    expect(sumNutrition([])).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    })
  })
})

describe('optimizeWeekSlots', () => {
  it.each([1800, 2200, 2600])(
    'balances the seed library across a week at %i calories',
    (calories) => {
      // Actual seed recipe nutrients, without importing the database seed script.
      const values = [
        [320, 10, 55, 6],
        [380, 22, 30, 16],
        [180, 15, 22, 3],
        [210, 5, 25, 12],
        [450, 40, 20, 22],
        [360, 18, 52, 6],
        [520, 38, 60, 8],
        [250, 7, 32, 12],
        [200, 18, 20, 4],
        [580, 42, 48, 18],
        [620, 35, 72, 18],
        [420, 22, 45, 16],
      ]
      const candidates = values.map(
        ([calories, proteinG, carbsG, fatG], i) => ({
          id: i + 1,
          calories,
          proteinG,
          carbsG,
          fatG,
          tags: [],
          allowedSlots: [],
        }),
      )
      const targets = { calories, proteinG: 120, carbsG: 250, fatG: 70 }
      const rows: ReturnType<typeof fillDaySlots> = []
      const usage = new Map<number, number>()
      for (let day = 7; day < 14; day++)
        rows.push(
          ...fillDaySlots(
            1,
            `2026-09-${String(day).padStart(2, '0')}`,
            [
              'breakfast',
              'morning_snack',
              'lunch',
              'afternoon_snack',
              'dinner',
            ],
            candidates,
            targets,
            { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
            usage,
            rows,
          ),
        )
      const optimized = optimizeWeekSlots(
        rows.map((row) => ({ ...row, group: `${row.date}|${row.mealType}` })),
        candidates,
        candidates,
        targets,
        [],
      )
      const counts = countMealUsage(optimized)
      // Old scorer: only 8 unique recipes, max usage 12/9/10 at these targets.
      expect(optimized).toHaveLength(35)
      expect(counts.size).toBe(12)
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(
        calories === 2600 ? 8 : 4,
      )
      for (const date of new Set(optimized.map((row) => row.date))) {
        const meals = optimized
          .filter((row) => row.date === date)
          .map((row) => candidates[row.mealId - 1])
        const dailyError =
          Math.abs(sumNutrition(meals).calories - calories) / calories
        expect(dailyError).toBeLessThanOrEqual(0.1)
        if (calories < 2600)
          expect(new Set(meals.map((meal) => meal.id)).size).toBe(5)
      }
    },
  )

  it('keeps every repeat-group day inside tolerance when possible, including existing meals and extras', () => {
    const candidates = [
      { id: 1, calories: 600, tags: [], allowedSlots: ['lunch'] },
      { id: 2, calories: 400, tags: [], allowedSlots: ['lunch'] },
    ]
    const slots = ['2026-09-07', '2026-09-08'].map((date) => ({
      planId: 1,
      date,
      mealType: 'lunch',
      mealId: 1,
      group: 'repeat',
    }))
    const existing = [
      { date: '2026-09-07', calories: 1400 },
      { date: '2026-09-08', calories: 1800 },
      { date: '2026-09-10', calories: 400, mealId: 2 },
      { date: '2026-09-12', calories: 400, mealId: 2 },
    ]
    const optimized = optimizeWeekSlots(
      slots,
      candidates,
      candidates,
      { calories: 2000, proteinG: 0, carbsG: 0, fatG: 0 },
      existing,
    )
    expect(optimized.map((slot) => slot.mealId)).toEqual([2, 2])
    expect(slots.map((slot) => slot.mealId)).toEqual([1, 1])
  })
  it('jointly fixes a choice that greedy slot order gets wrong', () => {
    const candidates = [
      { id: 1, calories: 500, tags: [], allowedSlots: ['breakfast'] },
      { id: 2, calories: 300, tags: [], allowedSlots: ['breakfast'] },
      { id: 3, calories: 700, tags: [], allowedSlots: ['dinner'] },
    ]
    const optimized = optimizeWeekSlots(
      [
        {
          planId: 1,
          date: '2026-07-16',
          mealType: 'breakfast',
          mealId: 1,
          group: 'breakfast',
        },
        {
          planId: 1,
          date: '2026-07-16',
          mealType: 'dinner',
          mealId: 3,
          group: 'dinner',
        },
      ],
      candidates,
      candidates,
      { calories: 1000, proteinG: 0, carbsG: 0, fatG: 0 },
      [],
    )
    expect(optimized.map((slot) => slot.mealId)).toEqual([2, 3])
  })

  it('changes repeat groups together and preserves locked groups', () => {
    const candidates = [
      { id: 1, calories: 500, tags: [], allowedSlots: ['lunch'] },
      { id: 2, calories: 300, tags: [], allowedSlots: ['lunch'] },
    ]
    const slots = [
      {
        planId: 1,
        date: '2026-07-13',
        mealType: 'lunch',
        mealId: 1,
        group: 'weekday-lunch',
      },
      {
        planId: 1,
        date: '2026-07-14',
        mealType: 'lunch',
        mealId: 1,
        group: 'weekday-lunch',
      },
    ]
    const optimized = optimizeWeekSlots(
      slots,
      candidates,
      candidates,
      { calories: 300, proteinG: 0, carbsG: 0, fatG: 0 },
      [],
    )
    expect(optimized.map((slot) => slot.mealId)).toEqual([2, 2])
    expect(
      optimizeWeekSlots(
        slots.map((slot) => ({ ...slot, locked: true })),
        candidates,
        candidates,
        { calories: 300, proteinG: 0, carbsG: 0, fatG: 0 },
        [],
      ).map((slot) => slot.mealId),
    ).toEqual([1, 1])
  })
})
