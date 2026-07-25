import { describe, it, expect } from 'vitest'
import {
  candidateMeals,
  filterByPrefs,
  pickUnused,
  mergeIngredients,
  rankByMacros,
  fillDaySlots,
  sumNutrition,
  mondayOf,
} from './plans'

const meals = [
  { id: 1, calories: 100, tags: ['Italian', 'no_gluten'], allowedSlots: [] },
  { id: 2, calories: 400, tags: ['Chinese', 'Vegan'], allowedSlots: [] },
  { id: 3, calories: 700, tags: ['Mediterranean'], allowedSlots: [] },
  { id: 4, calories: 900, tags: [], allowedSlots: [] },
]

describe('candidateMeals', () => {
  it('returns meals within budget (calories <= budget * 1.3)', () => {
    const result = candidateMeals(meals, 310) // threshold: 403, includes 100 and 400
    expect(result.map((m) => m.id)).toEqual([1, 2])
  })

  it('falls back to 3 lightest when nothing fits', () => {
    const result = candidateMeals(meals, 50) // threshold: 65, nothing fits
    expect(result.map((m) => m.id)).toEqual([1, 2, 3])
  })

  it('treats null calories as 0 (always fits)', () => {
    const withNull = [
      { id: 5, calories: null, tags: [], allowedSlots: [] },
      { id: 6, calories: 999, tags: [], allowedSlots: [] },
    ]
    const result = candidateMeals(withNull, 100)
    expect(result.map((m) => m.id)).toContain(5)
  })

  it('does not mutate the input array when falling back', () => {
    const input = [...meals]
    candidateMeals(input, 50)
    expect(input.map((m) => m.id)).toEqual([1, 2, 3, 4])
  })
})

describe('pickUnused', () => {
  it('never returns a used meal while fresh ones remain', () => {
    const used = new Set<number>()
    const seen = new Set<number>()
    for (let i = 0; i < meals.length; i++) {
      const chosen = pickUnused(meals, used)
      expect(used.has(chosen.id)).toBe(false) // no repeat within the week
      used.add(chosen.id)
      seen.add(chosen.id)
    }
    expect(seen.size).toBe(meals.length) // every distinct meal got used once
  })

  it('falls back to the full list once all are used', () => {
    const used = new Set(meals.map((m) => m.id))
    const chosen = pickUnused(meals, used)
    expect(meals.map((m) => m.id)).toContain(chosen.id)
  })
})

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

describe('mergeIngredients', () => {
  it('dedups case-insensitively, unifies to a capitalized name, counts, sorts by name', () => {
    const result = mergeIngredients([
      ['Eggs', 'flour', ' Milk '],
      ['eggs', 'Sugar'],
    ])
    expect(result).toEqual([
      { name: 'Eggs', count: 2 },
      { name: 'Flour', count: 1 },
      { name: 'Milk', count: 1 },
      { name: 'Sugar', count: 1 },
    ])
  })

  it('skips blank entries and handles no meals', () => {
    expect(mergeIngredients([['', '  '], []])).toEqual([])
    expect(mergeIngredients([])).toEqual([])
  })
})

describe('rankByMacros', () => {
  const m = (id: number, proteinG: number, carbsG: number, fatG: number) => ({
    id,
    calories: 100,
    tags: [],
    allowedSlots: [],
    proteinG,
    carbsG,
    fatG,
  })

  it('ranks meals closest to the macro budget first', () => {
    const cands = [m(1, 40, 10, 5), m(2, 10, 60, 25), m(3, 25, 30, 12)]
    const ranked = rankByMacros(
      cands,
      { proteinG: 25, carbsG: 30, fatG: 12 },
      3,
    )
    expect(ranked[0].id).toBe(3) // exact match wins
  })

  it('caps the shortlist at k so variety survives', () => {
    const cands = [m(1, 1, 1, 1), m(2, 2, 2, 2), m(3, 3, 3, 3), m(4, 4, 4, 4)]
    expect(
      rankByMacros(cands, { proteinG: 1, carbsG: 1, fatG: 1 }, 2),
    ).toHaveLength(2)
  })
})

describe('fillDaySlots', () => {
  const targets = { calories: 2000, proteinG: 100, carbsG: 200, fatG: 70 }

  it('fills an empty slot and shrinks the mutated consumed/used state', () => {
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
    const used = new Set<number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast'],
      only,
      targets,
      consumed,
      used,
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
    expect(used.has(1)).toBe(true)
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
    const used = new Set<number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast'],
      dinnerOnly,
      targets,
      consumed,
      used,
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
    const used = new Set<number>()

    const toInsert = fillDaySlots(
      1,
      '2026-07-16',
      ['breakfast', 'lunch'],
      twoMeals,
      targets,
      consumed,
      used,
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

describe('mondayOf', () => {
  it('returns the same date when given a Monday', () => {
    expect(mondayOf('2026-07-20')).toBe('2026-07-20') // a Monday
  })

  it('returns the prior Monday for any other day of the week', () => {
    expect(mondayOf('2026-07-22')).toBe('2026-07-20') // Wednesday
    expect(mondayOf('2026-07-26')).toBe('2026-07-20') // Sunday
  })
})
