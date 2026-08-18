import { describe, expect, it } from 'vitest'
import { ingredientShoppingKey, mergeShoppingItems } from './shopping'

describe('mergeShoppingItems', () => {
  it('applies saved state and keeps custom items without reviving stale ingredients', () => {
    const honeyKey = ingredientShoppingKey('Honey', 'tbsp')
    const items = mergeShoppingItems(
      [{ name: 'Honey', unit: 'tbsp', qty: 4, count: 2 }],
      [
        {
          key: honeyKey,
          name: 'Honey',
          unit: 'tbsp',
          aisle: 'Pantry',
          checked: true,
          excluded: false,
          custom: false,
        },
        {
          key: 'ingredient:["Old",null]',
          name: 'Old',
          unit: null,
          aisle: 'Other',
          checked: false,
          excluded: true,
          custom: false,
        },
        {
          key: 'custom:1',
          name: 'Bin bags',
          unit: null,
          aisle: 'Other',
          checked: false,
          excluded: false,
          custom: true,
        },
      ],
    )

    expect(items).toEqual([
      expect.objectContaining({
        key: honeyKey,
        checked: true,
        aisle: 'Pantry',
      }),
      expect.objectContaining({ key: 'custom:1', name: 'Bin bags' }),
    ])
  })
})
