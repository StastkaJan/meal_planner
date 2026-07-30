import { describe, expect, it } from 'vitest'
import { NUTRITION_TARGETS, resolveTargets } from './nutrition'

describe('resolveTargets', () => {
  it('uses defaults for missing targets and preserves overrides', () => {
    expect(resolveTargets(null)).toEqual(NUTRITION_TARGETS)
    expect(
      resolveTargets({
        calorieTarget: 1800,
        proteinTarget: null,
        carbsTarget: 200,
        fatTarget: null,
      }),
    ).toEqual({
      ...NUTRITION_TARGETS,
      calories: 1800,
      carbsG: 200,
    })
  })
})
