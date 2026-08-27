import { describe, expect, it, vi } from 'vitest'

const updateMeal = vi.hoisted(() => vi.fn())

vi.mock('../repositories/meals', () => ({
  createMeal: vi.fn(),
  findMeal: vi.fn(),
  getMealIngredients: vi.fn(),
  getMealTranslations: vi.fn(),
  updateMeal,
}))
vi.mock('../observability', () => ({
  monitorService: (_service: string, _operation: string, work: () => unknown) =>
    work(),
}))

import { localizeMeal, pickMealFields, updateUserMeal } from './meals'
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

  it('keeps the source locale immutable when updating a meal', async () => {
    updateMeal.mockResolvedValueOnce(meal)

    await updateUserMeal(1, { name: 'Stew', sourceLocale: 'cs' })

    expect(updateMeal).toHaveBeenCalledWith(1, { name: 'Stew' })
  })
})
