import { describe, expect, it } from 'vitest'
import { normalizeMeal, selectMeals } from './fetch-themealdb-recipes'

describe('normalizeMeal', () => {
  it('maps a source meal into the catalogue import shape', () => {
    expect(
      normalizeMeal({
        idMeal: '42',
        strMeal: ' Pasta ',
        strInstructions: ' Boil it. ',
        strCategory: 'Pasta',
        strArea: 'Italian',
        strMealThumb: 'https://example.com/pasta.jpg',
        strIngredient1: 'Spaghetti',
        strMeasure1: '250 g',
      }),
    ).toMatchObject({
      name: 'Pasta',
      tags: ['Italian'],
      ingredients: [{ name: 'Spaghetti', qty: 250, unit: 'g' }],
      instructions: 'Boil it.',
    })
  })

  it('selects a batch without recipes from an earlier file', () => {
    const meal = (idMeal: string, strMeal: string) =>
      ({ idMeal, strMeal, strInstructions: 'Cook it.' }) as any

    expect(
      selectMeals(
        [meal('1', 'Alpha'), meal('2', 'Beta'), meal('3', 'Gamma')],
        2,
        new Set(['Beta']),
      ).map(({ strMeal }) => strMeal),
    ).toEqual(['Alpha', 'Gamma'])
  })
})
