import { describe, expect, it } from 'vitest'
import {
  NUTRITION_TARGETS,
  nutritionProgress,
  resolveTargets,
} from './nutrition'

describe('resolveTargets', () => {
  it('uses defaults for missing targets and preserves overrides', () => {
    expect(resolveTargets(null)).toEqual(NUTRITION_TARGETS)
    expect(
      resolveTargets({
        calorieTarget: 1800,
        proteinTarget: null,
        carbsTarget: 200,
        fatTarget: null,
        fiberTarget: 25,
        sugarTarget: 60,
        saturatedFatTarget: 15,
        saltTarget: 5.5,
      }),
    ).toEqual({
      ...NUTRITION_TARGETS,
      calories: 1800,
      carbsG: 200,
      fiberG: 25,
      sugarG: 60,
      saturatedFatG: 15,
      saltG: 5.5,
    })
  })
})

describe('nutritionProgress', () => {
  it('caps the bar and warns from 20% over the reference', () => {
    expect(nutritionProgress(119, 100)).toEqual({
      percent: 100,
      wayOver: false,
    })
    expect(nutritionProgress(120, 100)).toEqual({
      percent: 100,
      wayOver: true,
    })
  })
})
