import { describe, expect, it } from 'vitest'
import {
  aggregateShoppingIngredients,
  matchIngredient,
  ingredientDisplayName,
  type IngredientOption,
  normalizeIngredientUnit,
} from './ingredients'

const options: IngredientOption[] = [
  {
    id: 1,
    name: 'Tomato',
    translations: {
      en: { name: 'Tomato', aliases: ['tomatoes'] },
      cs: { name: 'Rajče', aliases: ['rajčata'] },
    },
  },
  {
    id: 2,
    name: 'Canned tomatoes',
    translations: { cs: { name: 'Konzervovaná rajčata', aliases: [] } },
  },
]

describe('ingredient identity', () => {
  it('supports additional locales and falls back to the original name', () => {
    const option = {
      ...options[0],
      translations: {
        ...options[0].translations,
        de: { name: 'Tomate', aliases: ['tomaten'] },
      },
    }
    expect(ingredientDisplayName(option, 'de')).toBe('Tomate')
    expect(ingredientDisplayName(option, 'fr')).toBe('Tomato')
    expect(ingredientDisplayName(option, 'constructor')).toBe('Tomato')
    expect(matchIngredient(' TOMATEN ', [option])?.id).toBe(1)
  })
  it('matches complete aliases across languages/forms without merging preparation differences', () => {
    expect(matchIngredient('  RAJČATA ', options)?.id).toBe(1)
    expect(matchIngredient('tomatoes', options)?.id).toBe(1)
    expect(matchIngredient('Canned   tomatoes', options)?.id).toBe(2)
    expect(matchIngredient('tomato paste', options)).toBeUndefined()
    expect(
      matchIngredient('tomatoes', [
        ...options,
        {
          ...options[1],
          translations: {
            en: { name: 'Canned tomatoes', aliases: ['tomatoes'] },
          },
        },
      ]),
    ).toBeUndefined()
  })

  it('combines compatible quantities, preserves unknown quantities and separates incompatible units', () => {
    const row = {
      ingredientId: 1,
      name: 'Tomato',
      unit: 'g',
      qty: 250,
      count: 1,
    }
    expect(
      aggregateShoppingIngredients([
        row,
        { ...row, unit: 'kg', qty: 0.5 },
        { ...row, unit: 'ml', qty: 20 },
      ]),
    ).toEqual([
      { ...row, qty: 750, count: 2 },
      { ...row, unit: 'ml', qty: 20 },
    ])
    expect(
      aggregateShoppingIngredients([row, { ...row, unit: 'kg', qty: null }])[0]
        .qty,
    ).toBeNull()
    expect(normalizeIngredientUnit('constructor')).toEqual(['constructor', 1])
    expect(normalizeIngredientUnit('__proto__')).toEqual(['__proto__', 1])
    expect(normalizeIngredientUnit(null)).toEqual([null, 1])
    expect(normalizeIngredientUnit('kusy')).toEqual(['piece', 1])
  })
})
