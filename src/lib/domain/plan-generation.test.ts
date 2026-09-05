import { describe, it, expect } from 'vitest'
import {
  filterByPrefs,
  rankByNutrition,
  fillDaySlots,
  optimizeWeekSlots,
  sumNutrition,
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

  it('keeps ranking and first-candidate tie behavior when selecting without a sort', () => {
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
    ).toBe(9)
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
  it('scores repeated days, existing meals, and bonuses against a full-week oracle', () => {
    const candidates = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      calories: 200 + i * 50,
      proteinG: i * 3,
      carbsG: i * 5,
      fatG: i * 2,
      tags: [],
      allowedSlots: ['lunch'],
    }))
    const slots = ['2026-09-07', '2026-09-08'].map((date) => ({
      planId: 1,
      date,
      mealType: 'lunch',
      mealId: 1,
      group: 'repeat',
    }))
    const existing = [
      { ...candidates[4], date: '2026-09-07', mealId: 5 },
      {
        calories: 100,
        proteinG: '10',
        carbsG: null,
        fatG: '3',
        date: '2026-09-08',
      },
    ]
    const targets = { calories: 900, proteinG: 50, carbsG: 80, fatG: 30 }
    const objective = (meal: (typeof candidates)[number]) => {
      const rows = [
        ...existing,
        ...slots.map(({ date }) => ({ ...meal, date, mealId: meal.id })),
      ]
      const usage = new Map<number, number>()
      for (const row of rows)
        if ('mealId' in row)
          usage.set(row.mealId, (usage.get(row.mealId) ?? 0) + 1)
      let score = [...usage.values()].reduce(
        (sum, count) => sum + Math.max(0, count - 1) * 0.15,
        0,
      )
      for (const date of slots.map((slot) => slot.date)) {
        const total = sumNutrition(rows.filter((row) => row.date === date))
        score +=
          (Math.abs(total.calories - targets.calories) / targets.calories) * 5
        score +=
          (['proteinG', 'carbsG', 'fatG'] as const).reduce(
            (sum, key) =>
              sum + Math.abs(total[key] - targets[key]) / targets[key],
            0,
          ) / 3
      }
      return score
    }
    const optimized = optimizeWeekSlots(
      slots,
      candidates,
      candidates,
      targets,
      existing,
    )
    const selected = candidates.find((meal) => meal.id === optimized[0].mealId)!
    expect(objective(selected)).toBeCloseTo(
      Math.min(...candidates.map(objective)),
      10,
    )
    expect(optimized[0].mealId).toBe(optimized[1].mealId)
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
