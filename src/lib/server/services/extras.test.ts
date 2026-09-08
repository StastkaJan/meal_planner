import { describe, expect, it } from 'vitest'
import { parseExtra } from './extras'

describe('parseExtra', () => {
  it('trims names, preserves zero and decimal nutrition, and ignores ownership input', () => {
    expect(
      parseExtra({
        name: ' Coffee ',
        calories: 2,
        proteinG: 0,
        saltG: 0.02,
        userId: 999,
      }),
    ).toEqual({
      name: 'Coffee',
      calories: 2,
      proteinG: 0,
      carbsG: null,
      fatG: null,
      fiberG: null,
      sugarG: null,
      saturatedFatG: null,
      saltG: 0.02,
    })
  })
  it.each([
    { name: '' },
    { name: 'x'.repeat(201) },
    { name: 'Coffee', calories: 1.5 },
    { name: 'Coffee', saltG: -1 },
  ])('rejects invalid extras: %j', (body) => {
    expect(() => parseExtra(body)).toThrow()
  })
})
