import { describe, it, expect } from 'vitest'
import {
  pickMealFields,
  canAccessMeal,
  findRecipeNode,
  isoDurationToMinutes,
  parseRecipeJsonLd,
  parseEdamamRecipe,
} from './meals'

describe('canAccessMeal', () => {
  it('lets anyone access a global meal', () => {
    expect(canAccessMeal({ userId: null, archivedAt: null }, 1)).toBe(true)
    expect(canAccessMeal({ userId: null, archivedAt: null }, undefined)).toBe(
      true,
    )
  })
  it('lets only the owner access a personal meal', () => {
    expect(canAccessMeal({ userId: 1, archivedAt: null }, 1)).toBe(true)
    expect(canAccessMeal({ userId: 1, archivedAt: null }, 2)).toBe(false)
    expect(canAccessMeal({ userId: 1, archivedAt: null }, undefined)).toBe(
      false,
    )
  })
  it('rejects archived meals', () => {
    expect(canAccessMeal({ userId: null, archivedAt: new Date() }, 1)).toBe(
      false,
    )
    expect(canAccessMeal({ userId: 1, archivedAt: new Date() }, 1)).toBe(false)
  })
})

describe('pickMealFields', () => {
  it('keeps only writable columns', () => {
    const out = pickMealFields({
      name: 'Soup',
      calories: 300,
      tags: ['Italian'],
      allowedSlots: ['dinner'],
    })
    expect(out).toEqual({
      name: 'Soup',
      calories: 300,
      tags: ['Italian'],
      allowedSlots: ['dinner'],
    })
  })

  it('drops unknown/server-owned fields (mass-assignment guard)', () => {
    const out = pickMealFields({ id: 99, name: 'Soup', hacker: true })
    expect(out).toEqual({ name: 'Soup' })
    expect(out.id).toBeUndefined()
  })

  it('omits keys that are undefined so PATCH only sets provided fields', () => {
    const out = pickMealFields({ name: 'Soup', calories: undefined })
    expect('calories' in out).toBe(false)
  })
})

describe('isoDurationToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(isoDurationToMinutes('PT1H30M')).toBe(90)
    expect(isoDurationToMinutes('PT20M')).toBe(20)
    expect(isoDurationToMinutes('PT2H')).toBe(120)
  })
  it('returns undefined for junk', () => {
    expect(isoDurationToMinutes('banana')).toBeUndefined()
    expect(isoDurationToMinutes(undefined)).toBeUndefined()
  })
})

describe('findRecipeNode', () => {
  it('finds a Recipe inside @graph', () => {
    const doc = {
      '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Stew' }],
    }
    expect(findRecipeNode([doc])?.name).toBe('Stew')
  })
  it('finds a Recipe when @type is an array', () => {
    expect(
      findRecipeNode([[{ '@type': ['Thing', 'Recipe'], name: 'X' }]])?.name,
    ).toBe('X')
  })
  it('returns null when absent', () => {
    expect(findRecipeNode([{ '@type': 'Article' }])).toBeNull()
  })
})

describe('parseRecipeJsonLd', () => {
  it('maps the common schema.org Recipe fields', () => {
    const out = parseRecipeJsonLd({
      '@type': 'Recipe',
      name: '  Pancakes  ',
      description: 'Fluffy',
      image: [{ url: 'http://img/1.jpg' }],
      recipeIngredient: ['2 eggs', ' 1 cup flour '],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Mix' },
        { '@type': 'HowToStep', text: 'Fry' },
      ],
      nutrition: { calories: '320 kcal' },
      totalTime: 'PT25M',
    })
    expect(out).toEqual({
      name: 'Pancakes',
      description: 'Fluffy',
      imageUrl: 'http://img/1.jpg',
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: 'Mix\nFry',
      calories: 320,
      timeMinutes: 25,
    })
  })

  it('flattens HowToSection instructions and tolerates missing fields', () => {
    const out = parseRecipeJsonLd({
      name: 'Bare',
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          itemListElement: [{ text: 'Step A' }, { text: 'Step B' }],
        },
      ],
    })
    expect(out.instructions).toBe('Step A\nStep B')
    expect(out.calories).toBeUndefined()
    expect(out.ingredients).toBeUndefined()
  })
})

describe('parseEdamamRecipe', () => {
  it('maps a full Edamam hit', () => {
    const out = parseEdamamRecipe({
      label: 'Chicken Tikka Masala',
      image: 'http://img/tikka.jpg',
      ingredientLines: [' 1 lb chicken ', '1 cup yogurt'],
      calories: 1234.6,
      totalTime: 45,
      yield: 4,
      totalNutrients: {
        PROCNT: { quantity: 88.2, unit: 'g' },
        CHOCDF: { quantity: 30.1, unit: 'g' },
        FAT: { quantity: 60.9, unit: 'g' },
      },
      dietLabels: ['High-Protein'],
      cuisineType: ['Indian'],
      mealType: ['Dinner'],
    })
    expect(out).toEqual({
      name: 'Chicken Tikka Masala',
      imageUrl: 'http://img/tikka.jpg',
      ingredients: ['1 lb chicken', '1 cup yogurt'],
      calories: 1235,
      timeMinutes: 45,
      servings: 4,
      proteinG: 88,
      carbsG: 30,
      fatG: 61,
      tags: ['high-protein', 'indian', 'dinner'],
    })
  })

  it('tolerates missing optional fields', () => {
    const out = parseEdamamRecipe({
      label: 'Bare',
      ingredientLines: ['water'],
      calories: 100,
      totalTime: 0,
      yield: 0,
    })
    expect(out).toEqual({
      name: 'Bare',
      ingredients: ['water'],
      calories: 100,
    })
  })
})
