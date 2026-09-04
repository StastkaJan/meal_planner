import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSettings = vi.hoisted(() => vi.fn())
const listCandidateMeals = vi.hoisted(() => vi.fn())
const plans = vi.hoisted(() => ({
  getDayBonusNutrition: vi.fn(),
  getDaySlotsWithNutrition: vi.fn(),
  getSlotRepeats: vi.fn(),
  getWeekBonusNutrition: vi.fn(),
  getWeekMealIds: vi.fn(),
  getWeekSlotsWithNutrition: vi.fn(),
  insertSlots: vi.fn(),
  ownedPlan: vi.fn(),
}))

vi.mock('../repositories/accounts', () => ({ getSettings }))
vi.mock('../repositories/meals', () => ({ listCandidateMeals }))
vi.mock('../repositories/plans', () => plans)
vi.mock('../observability', () => ({
  monitorService: vi.fn(
    (_service: string, _operation: string, task: () => Promise<unknown>) =>
      task(),
  ),
}))

import { executePlanPopulation, recalculatePlanDay } from './plan-generation'

const candidate = {
  id: 11,
  calories: 500,
  tags: ['Italian', 'Vegan'],
  allowedSlots: [],
  proteinG: 20,
  carbsG: 60,
  fatG: 15,
}

const plan = {
  id: 4,
  userId: 7,
  cuisinePrefs: [],
  dietaryRestrictions: [],
  mealSlots: [],
} as any

describe('plan generation candidate queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSettings.mockResolvedValue({
      cuisinePrefs: ['Italian'],
      dietaryRestrictions: ['Vegan'],
    })
    listCandidateMeals.mockResolvedValue([candidate])
    plans.getDaySlotsWithNutrition.mockResolvedValue([])
    plans.getDayBonusNutrition.mockResolvedValue([])
    plans.getWeekMealIds.mockResolvedValue([])
    plans.getWeekSlotsWithNutrition.mockResolvedValue([])
    plans.getWeekBonusNutrition.mockResolvedValue([])
    plans.getSlotRepeats.mockResolvedValue([])
    plans.insertSlots.mockResolvedValue(undefined)
  })

  it('pushes all auto-compose candidate filters into the repository query', async () => {
    await executePlanPopulation(
      {
        type: 'populate-plan',
        planId: 4,
        userId: 7,
        week: '2026-08-31',
        favoritesOnly: true,
        myRecipesOnly: true,
      },
      plan,
    )

    expect(listCandidateMeals).toHaveBeenCalledWith(7, {
      favoritesOnly: true,
      myRecipesOnly: true,
      cuisinePrefs: ['Italian'],
      dietaryRestrictions: ['Vegan'],
    })
  })

  it('preserves preference fallback without dropping other SQL filters', async () => {
    listCandidateMeals
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([candidate])

    await executePlanPopulation(
      {
        type: 'populate-plan',
        planId: 4,
        userId: 7,
        week: '2026-08-31',
        favoritesOnly: true,
        myRecipesOnly: false,
      },
      plan,
    )

    expect(listCandidateMeals).toHaveBeenNthCalledWith(2, 7, {
      favoritesOnly: true,
      myRecipesOnly: false,
    })
  })

  it('pushes recalculation preferences into the repository query', async () => {
    await recalculatePlanDay(
      { ...plan, mealSlots: ['dinner'] },
      7,
      '2026-09-01',
    )

    expect(listCandidateMeals).toHaveBeenCalledWith(7, {
      cuisinePrefs: ['Italian'],
      dietaryRestrictions: ['Vegan'],
    })
  })
})
