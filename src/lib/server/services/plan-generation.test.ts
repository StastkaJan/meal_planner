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

  it('recalculates missing repeat slots from their existing group even outside the preference shortlist', async () => {
    listCandidateMeals.mockResolvedValue([{ ...candidate, id: 12 }])
    plans.getDaySlotsWithNutrition.mockResolvedValue([
      { ...candidate, mealId: 13, mealType: 'breakfast' },
    ])
    plans.getWeekSlotsWithNutrition.mockResolvedValue([
      {
        ...candidate,
        mealId: 11,
        mealType: 'lunch',
        date: '2026-09-07',
        archivedAt: null,
        mealUserId: null,
      },
    ])
    plans.getSlotRepeats.mockResolvedValue([
      {
        mealType: 'lunch',
        groupBreaks: [false, false, true, true, true, true],
      },
    ])
    await recalculatePlanDay(
      { ...plan, mealSlots: ['breakfast', 'lunch'] },
      7,
      '2026-09-08',
    )
    expect(plans.insertSlots).toHaveBeenCalledExactlyOnceWith([
      { planId: 4, date: '2026-09-08', mealType: 'lunch', mealId: 11 },
    ])
  })

  it('preserves populated slots and fills a locked repeat group during auto-compose', async () => {
    plans.getWeekSlotsWithNutrition.mockResolvedValue([
      {
        ...candidate,
        mealId: 11,
        mealType: 'lunch',
        date: '2026-09-07',
        archivedAt: null,
        mealUserId: null,
      },
    ])
    plans.getSlotRepeats.mockResolvedValue([
      {
        mealType: 'lunch',
        groupBreaks: [false, false, false, false, false, false],
      },
    ])
    listCandidateMeals.mockResolvedValue([{ ...candidate, id: 12 }])
    await executePlanPopulation(
      {
        type: 'populate-plan',
        planId: 4,
        userId: 7,
        week: '2026-09-07',
        favoritesOnly: false,
        myRecipesOnly: false,
      },
      { ...plan, mealSlots: ['lunch'] },
    )
    const [rows] = plans.insertSlots.mock.calls[0]
    expect(rows).toHaveLength(6)
    expect(
      rows.every(
        (row: { mealId: number; date: string }) =>
          row.mealId === 11 && row.date !== '2026-09-07',
      ),
    ).toBe(true)
  })

  it('reroll uses neighboring days and daily nutrition tolerance while changing only the requested slot', async () => {
    getSettings.mockResolvedValue({
      calorieTarget: 2000,
      proteinTarget: 0,
      carbsTarget: 0,
      fatTarget: 0,
    })
    plans.getDaySlotsWithNutrition.mockResolvedValue([
      { ...candidate, calories: 500, mealId: 11, mealType: 'dinner' },
      { ...candidate, calories: 1500, mealId: 14, mealType: 'lunch' },
    ])
    plans.getWeekMealIds.mockResolvedValue([
      { date: '2026-09-08', mealType: 'dinner', mealId: 12 },
      { date: '2026-09-11', mealType: 'dinner', mealId: 13 },
    ])
    listCandidateMeals.mockResolvedValue([
      { ...candidate, id: 12, calories: 500 },
      { ...candidate, id: 13, calories: 400 },
    ])
    await rerollPlanMeal(plan, '2026-09-07', 'dinner', {
      favoritesOnly: false,
      myRecipesOnly: false,
    })
    expect(plans.replaceSingleSlot).toHaveBeenCalledExactlyOnceWith(
      4,
      '2026-09-07',
      'dinner',
      11,
      13,
    )
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
