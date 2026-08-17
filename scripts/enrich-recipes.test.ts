import { describe, expect, it } from 'vitest'
import { buildFoodIndex, enrichRecipe } from './enrich-recipes'

describe('enrichRecipe', () => {
  it('adds USDA macros and conservative dietary tags', () => {
    const index = buildFoodIndex([
      {
        description: 'Chickpeas, cooked',
        foodNutrients: [
          { nutrient: { id: 1008 }, amount: 164 },
          { nutrient: { id: 1003 }, amount: 8.9 },
          { nutrient: { id: 1005 }, amount: 27.4 },
          { nutrient: { id: 1004 }, amount: 2.6 },
        ],
        foodPortions: [{ amount: 1, gramWeight: 164, modifier: 'cup' }],
      },
    ])
    const recipe = enrichRecipe(
      {
        name: 'Chickpeas',
        description: 'Vegetarian · Greek. Recipe data from TheMealDB (ID 1).',
        ingredients: [{ name: 'Chickpeas', qty: 2, unit: 'cup' }],
      },
      index,
    )

    expect(recipe).toMatchObject({
      calories: 538,
      proteinG: 29.2,
      carbsG: 89.9,
      fatG: 8.5,
      servings: 1,
    })
    expect(recipe.tags).toEqual(
      expect.arrayContaining([
        'Mediterranean',
        'Vegetarian',
        'Vegan',
        'no_eggs',
        'no_lactose',
        'no_gluten',
        'no_nuts',
        'high_protein',
      ]),
    )
    expect(
      enrichRecipe(
        {
          name: 'Chickpeas',
          description: 'Vegetarian · India. Recipe data from TheMealDB (ID 2).',
          ingredients: [{ name: 'Chickpeas', qty: 1, unit: 'cup' }],
        },
        index,
      ).tags,
    ).toContain('Indian')
  })

  it('recognizes source measures that combine grams and ounces', () => {
    const index = buildFoodIndex([
      {
        description: 'Butter, salted',
        foodNutrients: [
          { nutrient: { id: 1008 }, amount: 717 },
          { nutrient: { id: 1003 }, amount: 0.9 },
          { nutrient: { id: 1005 }, amount: 0.1 },
          { nutrient: { id: 1004 }, amount: 81.1 },
        ],
      },
    ])
    const recipe = enrichRecipe(
      {
        name: 'Butter test',
        ingredients: [{ name: 'g/3oz butter', qty: 75, unit: null }],
      },
      index,
    )

    expect(recipe.calories).toBe(538)
  })
})
