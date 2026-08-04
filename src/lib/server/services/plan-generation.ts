import { MEAL_TYPES } from '$lib/constants'
import { resolveTargets } from '$lib/domain/nutrition'
import { addDays, groupWindow, mondayOf } from '$lib/utils/date-time'
import type { Plan } from '$lib/database/schema'
import type { NutritionTargets } from '$lib/types'
import {
  fillDaySlots,
  filterByPrefs,
  sumNutrition,
} from '$lib/domain/plan-generation'
import type { CandidateMeal } from '$lib/domain/plan-generation'
import { getSettings } from '../repositories/accounts'
import { favoriteMealIds, listCandidateMeals } from '../repositories/meals'
import {
  getDayBonusNutrition,
  getDaySlotsWithNutrition,
  getSlotRepeats,
  getWeekBonusNutrition,
  getWeekMealIds,
  getWeekSlotsWithNutrition,
  insertSlots,
  ownedPlan,
} from '../repositories/plans'

type PlanPrefs = Pick<Plan, 'id' | 'cuisinePrefs' | 'dietaryRestrictions'>

export type PlanPopulationCommand = {
  type: 'populate-plan'
  planId: number
  userId: number
  week: string
  favoritesOnly: boolean
}

const toCandidate = (
  meal: Awaited<ReturnType<typeof listCandidateMeals>>[number],
): CandidateMeal => ({
  ...meal,
  proteinG: Number(meal.proteinG ?? 0) || 0,
  carbsG: Number(meal.carbsG ?? 0) || 0,
  fatG: Number(meal.fatG ?? 0) || 0,
})

async function autocomposeSlots(
  plan: PlanPrefs,
  week: string,
  targets: NutritionTargets,
  ownerId: number,
  favoritesOnly: boolean,
) {
  const [mealRows, existingSlots, favoriteIds, weekBonus, repeatRows] =
    await Promise.all([
      listCandidateMeals(ownerId),
      getWeekSlotsWithNutrition(plan.id, week),
      favoritesOnly ? favoriteMealIds(ownerId) : Promise.resolve(null),
      getWeekBonusNutrition(plan.id, week),
      getSlotRepeats(plan.id),
    ])
  if (!mealRows.length) return 0

  let candidateMeals = mealRows.map(toCandidate)
  const visibleMealsById = new Map(
    candidateMeals.map((meal) => [meal.id, meal]),
  )
  if (favoriteIds)
    candidateMeals = candidateMeals.filter((meal) => favoriteIds.has(meal.id))

  const filteredMeals = filterByPrefs(
    candidateMeals,
    plan.cuisinePrefs,
    plan.dietaryRestrictions,
  )
  const filled = new Set(
    existingSlots.map((slot) => `${slot.date}-${slot.mealType}`),
  )
  const usageCounts = new Map<number, number>()
  for (const { mealId } of existingSlots) {
    if (mealId !== null)
      usageCounts.set(mealId, (usageCounts.get(mealId) ?? 0) + 1)
  }
  const breaksByType = new Map(
    repeatRows.map((row) => [row.mealType, row.groupBreaks]),
  )
  const groupKey = (date: string, mealType: string) => {
    const breaks = breaksByType.get(mealType)
    return breaks ? `${mealType}|${groupWindow(date, breaks)[0]}` : null
  }
  const groupMealId = new Map<string, number>()
  for (const slot of existingSlots) {
    if (slot.mealId === null) continue
    const key = groupKey(slot.date, slot.mealType)
    if (key && !groupMealId.has(key)) groupMealId.set(key, slot.mealId)
  }

  const rows: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[] = []

  for (let day = 0; day < 7; day++) {
    const date = addDays(week, day)
    const consumed = sumNutrition([
      ...existingSlots.filter((slot) => slot.date === date),
      ...weekBonus.filter((item) => item.date === date),
    ])
    const emptySlots = MEAL_TYPES.filter(
      (mealType) => !filled.has(`${date}-${mealType}`),
    )
    const freshSlots: string[] = []

    for (const mealType of emptySlots) {
      const key = groupKey(date, mealType)
      const repeatedMeal = key
        ? visibleMealsById.get(groupMealId.get(key) ?? -1)
        : undefined
      if (!repeatedMeal) {
        freshSlots.push(mealType)
        continue
      }
      usageCounts.set(
        repeatedMeal.id,
        (usageCounts.get(repeatedMeal.id) ?? 0) + 1,
      )
      rows.push({ planId: plan.id, date, mealType, mealId: repeatedMeal.id })
      consumed.calories += repeatedMeal.calories ?? 0
      consumed.proteinG += repeatedMeal.proteinG ?? 0
      consumed.carbsG += repeatedMeal.carbsG ?? 0
      consumed.fatG += repeatedMeal.fatG ?? 0
    }

    const generated = fillDaySlots(
      plan.id,
      date,
      freshSlots,
      filteredMeals,
      targets,
      consumed,
      usageCounts,
    )
    for (const row of generated) {
      const key = groupKey(row.date, row.mealType)
      if (key) groupMealId.set(key, row.mealId)
    }
    rows.push(...generated)
  }

  await insertSlots(rows)
  return rows.length
}

async function recalcDaySlots(
  plan: PlanPrefs,
  date: string,
  targets: NutritionTargets,
  ownerId: number,
) {
  const daySlots = await getDaySlotsWithNutrition(plan.id, date)
  const filled = new Set(daySlots.map((slot) => slot.mealType))
  const emptySlots = MEAL_TYPES.filter((mealType) => !filled.has(mealType))
  if (!emptySlots.length) return 0

  const [mealRows, dayBonus, weekMealIds] = await Promise.all([
    listCandidateMeals(ownerId),
    getDayBonusNutrition(plan.id, date),
    getWeekMealIds(plan.id, mondayOf(date)),
  ])
  if (!mealRows.length) return 0

  const candidateMeals = filterByPrefs(
    mealRows.map(toCandidate),
    plan.cuisinePrefs,
    plan.dietaryRestrictions,
  )
  const usageCounts = new Map<number, number>()
  for (const { mealId } of weekMealIds) {
    if (mealId !== null)
      usageCounts.set(mealId, (usageCounts.get(mealId) ?? 0) + 1)
  }
  const rows = fillDaySlots(
    plan.id,
    date,
    emptySlots,
    candidateMeals,
    targets,
    sumNutrition([...daySlots, ...dayBonus]),
    usageCounts,
  )
  await insertSlots(rows)
  return rows.length
}

export async function executePlanPopulation(
  command: PlanPopulationCommand,
  loadedPlan?: Plan & { userId: number },
) {
  const plan = loadedPlan ?? (await ownedPlan(command.planId, command.userId))
  if (!plan) throw new Error('Plan not found')
  const settings = await getSettings(command.userId)
  return autocomposeSlots(
    {
      ...plan,
      cuisinePrefs: settings?.cuisinePrefs ?? [],
      dietaryRestrictions: settings?.dietaryRestrictions ?? [],
    },
    command.week,
    resolveTargets(settings),
    command.userId,
    command.favoritesOnly,
  )
}

export async function recalculatePlanDay(
  plan: Plan & { userId: number },
  userId: number,
  date: string,
) {
  const settings = await getSettings(userId)
  return recalcDaySlots(
    {
      ...plan,
      cuisinePrefs: settings?.cuisinePrefs ?? [],
      dietaryRestrictions: settings?.dietaryRestrictions ?? [],
    },
    date,
    resolveTargets(settings),
    userId,
  )
}
