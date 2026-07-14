import { describe, it, expect } from 'vitest'
import {
  resolveTargets,
  NUTRITION_TARGETS,
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  mealFitsSlot,
  isValidTime,
} from './constants'

describe('tag categories', () => {
  it('treats Vegetarian/Vegan as diet restrictions, not cuisines', () => {
    for (const t of ['Vegetarian', 'Vegan']) {
      expect(DIET_OPTIONS).toContain(t)
      expect(CUISINE_OPTIONS).not.toContain(t)
    }
  })
})

describe('mealFitsSlot', () => {
  it('treats an empty allowedSlots as valid for any slot', () => {
    expect(mealFitsSlot([], 'breakfast')).toBe(true)
    expect(mealFitsSlot([], 'dinner')).toBe(true)
  })
  it('restricts to the listed slot types', () => {
    expect(mealFitsSlot(['breakfast'], 'breakfast')).toBe(true)
    expect(mealFitsSlot(['breakfast'], 'dinner')).toBe(false)
  })
})

describe('resolveTargets', () => {
  it('falls back to global defaults when the user or all columns are null', () => {
    expect(resolveTargets(null)).toEqual(NUTRITION_TARGETS)
    expect(
      resolveTargets({
        calorieTarget: null,
        proteinTarget: null,
        carbsTarget: null,
        fatTarget: null,
      }),
    ).toEqual(NUTRITION_TARGETS)
  })

  it('overrides only the columns the user has set', () => {
    const t = resolveTargets({
      calorieTarget: 1800,
      proteinTarget: null,
      carbsTarget: 200,
      fatTarget: null,
    })
    expect(t.calories).toBe(1800)
    expect(t.carbsG).toBe(200)
    expect(t.proteinG).toBe(NUTRITION_TARGETS.proteinG) // untouched
    expect(t.fatG).toBe(NUTRITION_TARGETS.fatG)
  })
})

describe('isValidTime', () => {
  it('accepts zero-padded 24h HH:MM', () => {
    expect(isValidTime('08:30')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('00:00')).toBe(true)
  })

  it('rejects unpadded, out-of-range, or malformed times', () => {
    expect(isValidTime('8:30')).toBe(false)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('12:60')).toBe(false)
    expect(isValidTime('lunch')).toBe(false)
  })
})
