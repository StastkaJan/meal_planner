import { describe, expect, it, vi } from 'vitest'

vi.mock('../repositories/meals', () => ({
  createMeal: vi.fn(),
  findMeal: vi.fn(),
  getMealIngredients: vi.fn(),
  getMealTranslations: vi.fn(),
  updateMeal: vi.fn(),
}))
vi.mock('../observability', () => ({
  monitorService: (_service: string, _operation: string, work: () => unknown) =>
    work(),
}))

import { localizeMeal, pickMealFields } from './meals'
import type { Meal } from '$lib/database/schema'

const meal: Meal = {
  id: 1,
  userId: null,
  sourceLocale: 'en',
  name: 'Soup',
  description: 'Original description',
  instructions: 'Cook it',
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  tags: [],
  allowedSlots: [],
  imageUrl: null,
  timeMinutes: null,
  difficulty: null,
  servings: 1,
  archivedAt: null,
}

describe('meal localization', () => {
  it('overlays translated fields and falls back field by field', () => {
    expect(
      localizeMeal(meal, {
        mealId: 1,
        locale: 'cs',
        name: 'Polévka',
        description: null,
        instructions: 'Uvařte ji',
      }),
    ).toMatchObject({
      name: 'Polévka',
      description: 'Original description',
      instructions: 'Uvařte ji',
    })
  })

  it('accepts supported source locales only', () => {
    expect(pickMealFields({ sourceLocale: 'cs-CZ' })).toEqual({
      sourceLocale: 'cs',
    })
    expect(pickMealFields({ sourceLocale: 'xx' })).toEqual({})
  })
})
