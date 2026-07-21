import { describe, it, expect } from 'vitest'
import {
  candidateMeals,
  filterByPrefs,
  pickUnused,
  sumIngredients,
  rankByMacros,
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

describe('sumIngredients', () => {
  it('dedups case-insensitively and sorts by name', () => {
    const result = sumIngredients([
      { name: 'Eggs', qty: null },
      { name: 'Flour', qty: null },
      { name: 'Milk', qty: null },
      { name: 'eggs', qty: null },
      { name: 'Sugar', qty: null },
    ])
    expect(result).toEqual([
      { name: 'Eggs', count: 2, qty: null },
      { name: 'Flour', count: 1, qty: null },
      { name: 'Milk', count: 1, qty: null },
      { name: 'Sugar', count: 1, qty: null },
    ])
  })

  it('handles no rows', () => {
    expect(sumIngredients([])).toEqual([])
  })

  it('sums quantities for the same ingredient across meals', () => {
    const result = sumIngredients([
      { name: 'Carrots', qty: '2' },
      { name: 'Carrots', qty: '2' },
    ])
    expect(result).toEqual([{ name: 'Carrots', count: 2, qty: 4 }])
  })

  it('sums differing quantities', () => {
    const result = sumIngredients([
      { name: 'Onion', qty: '1' },
      { name: 'Onion', qty: '2' },
    ])
    expect(result).toEqual([{ name: 'Onion', count: 2, qty: 3 }])
  })

  it('falls back to a plain count when any occurrence lacks a quantity', () => {
    const result = sumIngredients([
      { name: 'Carrots', qty: '2' },
      { name: 'Carrots', qty: null },
    ])
    expect(result).toEqual([{ name: 'Carrots', count: 2, qty: null }])
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
