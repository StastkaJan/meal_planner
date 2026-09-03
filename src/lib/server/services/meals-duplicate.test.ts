import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMeal = vi.hoisted(() => vi.fn())
const findMeal = vi.hoisted(() => vi.fn())
const getMealIngredients = vi.hoisted(() => vi.fn())
const getMealTranslations = vi.hoisted(() => vi.fn())
const copyMealImage = vi.hoisted(() => vi.fn())

vi.mock('../repositories/meals', () => ({
  createMeal,
  findMeal,
  getMealIngredients,
  getMealTranslations,
  updateMeal: vi.fn(),
}))
vi.mock('../meal-images', () => ({ copyMealImage }))
vi.mock('../observability', () => ({
  monitorService: (_service: string, _operation: string, task: () => unknown) =>
    task(),
}))

import { duplicateGlobalMeal } from './meals'

beforeEach(() => vi.clearAllMocks())

describe('duplicateGlobalMeal', () => {
  it('copies a global recipe and its optimized image', async () => {
    findMeal.mockResolvedValueOnce({ id: 7, userId: null, name: 'Soup' })
    getMealIngredients.mockResolvedValueOnce([])
    getMealTranslations.mockResolvedValueOnce([])
    createMeal.mockResolvedValueOnce({ id: 9, userId: 42, name: 'Soup' })

    await expect(duplicateGlobalMeal(42, 7)).resolves.toMatchObject({ id: 9 })
    expect(copyMealImage).toHaveBeenCalledWith(7, 9)
  })

  it('does not copy a personal recipe', async () => {
    findMeal.mockResolvedValueOnce({ id: 7, userId: 8, name: 'Soup' })
    await expect(duplicateGlobalMeal(42, 7)).resolves.toBeNull()
    expect(createMeal).not.toHaveBeenCalled()
    expect(copyMealImage).not.toHaveBeenCalled()
  })
})
