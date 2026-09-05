import { describe, expect, it } from 'vitest'
import { InvalidMealInputError, validateMealFields } from './meal-input'

describe('validateMealFields', () => {
  it('trims names and normalizes browser numeric strings', () => {
    expect(
      validateMealFields(
        {
          name: '  Soup  ',
          calories: '250',
          servings: '2',
          proteinG: '',
        },
        true,
      ),
    ).toEqual({
      name: 'Soup',
      calories: 250,
      servings: 2,
      proteinG: null,
    })
  })

  it.each([
    [{ name: '   ' }, true],
    [{ calories: -1 }, false],
    [{ calories: 1.5 }, false],
    [{ servings: 0 }, false],
    [{ servings: 1.5 }, false],
  ])('rejects invalid meal fields %#', (fields, requireName) => {
    expect(() => validateMealFields(fields, requireName)).toThrow(
      InvalidMealInputError,
    )
  })

  it('normalizes valid ingredients', () => {
    expect(
      validateMealFields({
        ingredients: [
          { name: ' Flour ', qty: '2.5', unit: 'cup' },
          { name: 'Salt', qty: null, unit: null },
        ],
      }),
    ).toEqual({
      ingredients: [
        { name: 'Flour', qty: 2.5, unit: 'cup' },
        { name: 'Salt', qty: null, unit: null },
      ],
    })
  })

  it.each([
    { ingredients: { name: 'Flour', qty: 1, unit: 'cup' } },
    { ingredients: [{ qty: 1, unit: 'cup' }] },
    { ingredients: [{ name: '', qty: 1, unit: 'cup' }] },
    { ingredients: [{ name: 'Flour', qty: -1, unit: 'cup' }] },
    { ingredients: [{ name: 'Flour', qty: 1, unit: 'bucket' }] },
    { ingredients: [{ name: 'Flour', qty: null, unit: 'cup' }] },
  ])('rejects invalid ingredient fields %#', (fields) => {
    expect(() => validateMealFields(fields)).toThrow(InvalidMealInputError)
  })

  it.each([
    { tags: 'Italian' },
    { tags: ['Italian', 1] },
    { allowedSlots: 'dinner' },
    { allowedSlots: ['supper'] },
    { difficulty: 'impossible' },
    { imageUrl: { href: 'https://example.com/image.jpg' } },
    { description: [] },
    { instructions: 42 },
  ])('rejects malformed non-numeric fields %#', (fields) => {
    expect(() => validateMealFields(fields)).toThrow(InvalidMealInputError)
  })

  it.each([
    [{}, true, 'Name is required'],
    [{ calories: -1 }, false, 'Invalid meal numeric value'],
    [{ ingredients: {} }, false, 'Ingredients must be a list'],
    [
      { ingredients: [{ qty: 1, unit: 'cup' }] },
      false,
      'Ingredient name is required',
    ],
    [
      { ingredients: [{ name: 'Flour', qty: 1, unit: 'bucket' }] },
      false,
      'Invalid ingredient unit',
    ],
    [
      { ingredients: [{ name: 'Flour', qty: null, unit: 'cup' }] },
      false,
      'Ingredient quantity is required when a unit is set',
    ],
    [{ tags: 'Italian' }, false, 'Invalid tags'],
    [{ allowedSlots: ['supper'] }, false, 'Invalid allowed slots'],
    [{ difficulty: 'impossible' }, false, 'Invalid difficulty'],
    [{ instructions: 42 }, false, 'Invalid meal text value'],
  ] as const)(
    'preserves validation error messages %#',
    (fields, requireName, message) => {
      expect(() => validateMealFields(fields, requireName)).toThrow(message)
    },
  )

  it('normalizes an empty difficulty from the edit form', () => {
    expect(validateMealFields({ difficulty: '' })).toEqual({
      difficulty: null,
    })
  })
})
