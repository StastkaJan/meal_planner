import { describe, it, expect } from 'vitest'
import { parseIngredientLine } from './ingredients'

describe('parseIngredientLine', () => {
  it('splits a leading integer off the name (no recognized unit)', () => {
    expect(parseIngredientLine('2 carrots')).toEqual({
      qty: 2,
      unit: null,
      name: 'carrots',
    })
  })

  it('splits qty, unit and name for a leading decimal and a leading fraction', () => {
    expect(parseIngredientLine('1.5 cups flour')).toEqual({
      qty: 1.5,
      unit: 'cup',
      name: 'flour',
    })
    expect(parseIngredientLine('1/2 cup sugar')).toEqual({
      qty: 0.5,
      unit: 'cup',
      name: 'sugar',
    })
  })

  it('splits a unit glued directly to the quantity', () => {
    expect(parseIngredientLine('200g Greek yogurt')).toEqual({
      qty: 200,
      unit: 'g',
      name: 'Greek yogurt',
    })
  })

  it('falls back to the whole remainder as name when the first word is not a unit', () => {
    expect(parseIngredientLine('1 large apple')).toEqual({
      qty: 1,
      unit: null,
      name: 'large apple',
    })
  })

  it('returns a null qty and unit when there is no leading number', () => {
    expect(parseIngredientLine('salt and pepper')).toEqual({
      qty: null,
      unit: null,
      name: 'salt and pepper',
    })
  })
})
