import { describe, it, expect } from 'vitest'
import {
  resolveTargets,
  NUTRITION_TARGETS,
  CUISINE_OPTIONS,
  DIET_OPTIONS,
} from './types'

describe('tag categories', () => {
  it('treats Vegetarian/Vegan as diet restrictions, not cuisines', () => {
    for (const t of ['Vegetarian', 'Vegan']) {
      expect(DIET_OPTIONS).toContain(t)
      expect(CUISINE_OPTIONS).not.toContain(t)
    }
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
