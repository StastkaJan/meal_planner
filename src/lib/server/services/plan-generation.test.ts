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
  replaceSingleSlot: vi.fn(),
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

import {
  executePlanPopulation,
  recalculatePlanDay,
  rerollPlanMeal,
} from './plan-generation'

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
    plans.replaceSingleSlot.mockResolvedValue(true)
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

  it('rerolls only the selected meal, excluding its current recipe and incompatible slots', async () => {
    plans.getDaySlotsWithNutrition.mockResolvedValue([
      { ...candidate, mealId: 11, mealType: 'dinner' },
      { ...candidate, mealId: 12, mealType: 'lunch' },
    ])
    listCandidateMeals.mockResolvedValue([
      candidate,
      { ...candidate, id: 13, allowedSlots: ['breakfast'] },
      { ...candidate, id: 14, allowedSlots: ['dinner'] },
    ])
    expect(
      await rerollPlanMeal(plan, '2026-09-01', 'dinner', {
        favoritesOnly: true,
        myRecipesOnly: true,
      }),
    ).toEqual({ changed: true })
    expect(plans.replaceSingleSlot).toHaveBeenCalledExactlyOnceWith(
      4,
      '2026-09-01',
      'dinner',
      11,
      14,
    )
    expect(plans.insertSlots).not.toHaveBeenCalled()
    expect(listCandidateMeals).toHaveBeenCalledWith(7, {
      favoritesOnly: true,
      myRecipesOnly: true,
      cuisinePrefs: ['Italian'],
      dietaryRestrictions: ['Vegan'],
    })
  })

  it('keeps the current recipe when no different matching recipe exists', async () => {
    plans.getDaySlotsWithNutrition.mockResolvedValue([
      { ...candidate, mealId: 11, mealType: 'dinner' },
    ])
    expect(
      await rerollPlanMeal(plan, '2026-09-01', 'dinner', {
        favoritesOnly: false,
        myRecipesOnly: false,
      }),
    ).toEqual({ changed: false })
    expect(plans.replaceSingleSlot).not.toHaveBeenCalled()
  })

  it('rejects rerolling an empty slot', async () => {
    await expect(
      rerollPlanMeal(plan, '2026-09-01', 'dinner', {
        favoritesOnly: false,
        myRecipesOnly: false,
      }),
    ).rejects.toMatchObject({ status: 404 })
    expect(plans.replaceSingleSlot).not.toHaveBeenCalled()
  })

  it('reports a concurrent slot change instead of overwriting it', async () => {
    plans.getDaySlotsWithNutrition.mockResolvedValue([
      { ...candidate, mealId: 10, mealType: 'dinner' },
    ])
    plans.replaceSingleSlot.mockResolvedValue(false)
    await expect(
      rerollPlanMeal(plan, '2026-09-01', 'dinner', {
        favoritesOnly: false,
        myRecipesOnly: false,
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
