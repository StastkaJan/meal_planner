import { error } from '@sveltejs/kit'
import { resolveTargets } from '$lib/domain/nutrition'
import { addDays, groupWindow, mondayOf } from '$lib/utils/date-time'
import type { Plan } from '$lib/database/schema'
import type { NutritionTargets } from '$lib/types'
import {
  fillDaySlots,
  countMealUsage,
  optimizeWeekSlots,
  sumNutrition,
} from '$lib/domain/plan-generation'
import type { CandidateMeal } from '$lib/domain/plan-generation'
import { getSettings } from '../repositories/accounts'
import { listCandidateMeals } from '../repositories/meals'
import {
  getDayBonusNutrition,
  getDaySlotsWithNutrition,
  getSlotRepeats,
  getWeekBonusNutrition,
  getWeekMealIds,
  getWeekSlotsWithNutrition,
  insertSlots,
  ownedPlan,
  replaceSingleSlot,
} from '../repositories/plans'
import { monitorService } from '../observability'

type PlanPrefs = Pick<
  Plan,
  'id' | 'cuisinePrefs' | 'dietaryRestrictions' | 'mealSlots'
>

export type PlanPopulationCommand = {
  type: 'populate-plan'
  planId: number
  userId: number
  week: string
  favoritesOnly: boolean
  myRecipesOnly: boolean
}

type CandidateFilters = NonNullable<Parameters<typeof listCandidateMeals>[1]>

function withRepeatGroups(
  rows: Awaited<ReturnType<typeof getWeekMealIds>>,
  repeats: Awaited<ReturnType<typeof getSlotRepeats>>,
) {
  const breaksByType = new Map(
    repeats.map((row) => [row.mealType, row.groupBreaks]),
  )
  return rows.map((row) => {
    const breaks = breaksByType.get(row.mealType)
    return {
      ...row,
      group: breaks
        ? `${row.mealType}|${groupWindow(row.date, breaks)[0]}`
        : undefined,
    }
  })
}

async function listPreferredCandidateMeals(
  userId: number,
  filters: CandidateFilters,
) {
  const candidates = await listCandidateMeals(userId, filters)
  if (
    candidates.length ||
    (!filters.cuisinePrefs?.length && !filters.dietaryRestrictions?.length)
  )
    return candidates

  return listCandidateMeals(userId, {
    favoritesOnly: filters.favoritesOnly,
    myRecipesOnly: filters.myRecipesOnly,
  })
}

function candidateFromExistingSlot(
  slot: Awaited<ReturnType<typeof getWeekSlotsWithNutrition>>[number],
  ownerId: number,
): CandidateMeal | null {
  if (
    slot.mealId === null ||
    slot.archivedAt !== null ||
    (slot.mealUserId !== null && slot.mealUserId !== ownerId)
  )
    return null
  return {
    id: slot.mealId,
    calories: slot.calories,
    proteinG: slot.proteinG ?? 0,
    carbsG: slot.carbsG ?? 0,
    fatG: slot.fatG ?? 0,
    tags: [],
    allowedSlots: [],
  }
}

async function autocomposeSlots(
  plan: PlanPrefs,
  week: string,
  targets: NutritionTargets,
  ownerId: number,
  favoritesOnly: boolean,
  myRecipesOnly: boolean,
) {
  const [candidateMeals, existingSlots, weekBonus, repeatRows] =
    await Promise.all([
      listPreferredCandidateMeals(ownerId, {
        favoritesOnly,
        myRecipesOnly,
        cuisinePrefs: plan.cuisinePrefs,
        dietaryRestrictions: plan.dietaryRestrictions,
      }),
      getWeekSlotsWithNutrition(plan.id, week),
      getWeekBonusNutrition(plan.id, week),
      getSlotRepeats(plan.id),
    ])
  const visibleMealsById = new Map<number, CandidateMeal>(
    candidateMeals.map((meal) => [meal.id, meal] as const),
  )
  for (const slot of existingSlots) {
    const meal = candidateFromExistingSlot(slot, ownerId)
    if (meal && !visibleMealsById.has(meal.id))
      visibleMealsById.set(meal.id, meal)
  }
  const visibleMeals = [...visibleMealsById.values()]
  if (!visibleMeals.length) return 0
  const filled = new Set(
    existingSlots.map((slot) => `${slot.date}-${slot.mealType}`),
  )
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
  const lockedGroupKeys = new Set(groupMealId.keys())

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
    const emptySlots = plan.mealSlots.filter(
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
      rows.push({ planId: plan.id, date, mealType, mealId: repeatedMeal.id })
      consumed.calories += repeatedMeal.calories ?? 0
      consumed.proteinG += repeatedMeal.proteinG ?? 0
      consumed.carbsG += repeatedMeal.carbsG ?? 0
      consumed.fatG += repeatedMeal.fatG ?? 0
    }

    const history = [...existingSlots, ...rows].map((row) => ({
      ...row,
      group: groupKey(row.date, row.mealType) ?? undefined,
    }))
    const generated = fillDaySlots(
      plan.id,
      date,
      freshSlots,
      candidateMeals,
      targets,
      consumed,
      countMealUsage(history),
      history,
    )
    for (const row of generated) {
      const key = groupKey(row.date, row.mealType)
      if (key) groupMealId.set(key, row.mealId)
    }
    rows.push(...generated)
  }

  const optimized = optimizeWeekSlots(
    rows.map((row) => {
      const key = groupKey(row.date, row.mealType)
      return {
        ...row,
        group: key ?? `${row.date}|${row.mealType}`,
        locked: key ? lockedGroupKeys.has(key) : false,
      }
    }),
    candidateMeals,
    visibleMeals,
    targets,
    [
      ...existingSlots.map((row) => ({
        ...row,
        group: groupKey(row.date, row.mealType) ?? undefined,
      })),
      ...weekBonus,
    ],
  ).map(({ group: _group, locked: _locked, ...row }) => row)

  await insertSlots(optimized)
  return optimized.length
}

async function recalcDaySlots(
  plan: PlanPrefs,
  date: string,
  targets: NutritionTargets,
  ownerId: number,
) {
  const daySlots = await getDaySlotsWithNutrition(plan.id, date)
  const filled = new Set(daySlots.map((slot) => slot.mealType))
  const emptySlots = plan.mealSlots.filter((mealType) => !filled.has(mealType))
  if (!emptySlots.length) return 0

  const [candidateMeals, dayBonus, weekSlots, repeatRows] = await Promise.all([
    listPreferredCandidateMeals(ownerId, {
      cuisinePrefs: plan.cuisinePrefs,
      dietaryRestrictions: plan.dietaryRestrictions,
    }),
    getDayBonusNutrition(plan.id, date),
    getWeekSlotsWithNutrition(plan.id, mondayOf(date)),
    getSlotRepeats(plan.id),
  ])
  const history = withRepeatGroups(weekSlots, repeatRows)
  const repeated = withRepeatGroups(
    emptySlots.map((mealType) => ({ date, mealType, mealId: null })),
    repeatRows,
  ).flatMap((slot) => {
    if (!slot.group) return []
    const index = history.findIndex(
      (row, index) =>
        row.group === slot.group &&
        row.mealId != null &&
        candidateFromExistingSlot(weekSlots[index], ownerId),
    )
    const meal =
      index < 0 ? null : candidateFromExistingSlot(weekSlots[index], ownerId)
    return meal
      ? [
          {
            planId: plan.id,
            date,
            mealType: slot.mealType,
            mealId: meal.id,
            meal,
            group: slot.group,
          },
        ]
      : []
  })
  const remaining = emptySlots.filter(
    (mealType) => !repeated.some((row) => row.mealType === mealType),
  )
  const allHistory = [...history, ...repeated]
  const generated = fillDaySlots(
    plan.id,
    date,
    remaining,
    candidateMeals,
    targets,
    sumNutrition([
      ...daySlots,
      ...dayBonus,
      ...repeated.map((row) => row.meal),
    ]),
    countMealUsage(allHistory),
    allHistory,
  )
  const rows = [
    ...repeated.map(({ meal: _meal, group: _group, ...row }) => row),
    ...generated,
  ]
  await insertSlots(rows)
  return rows.length
}

export async function executePlanPopulation(
  command: PlanPopulationCommand,
  loadedPlan?: Plan & { userId: number },
) {
  return monitorService('plan_generation', 'populate', async () => {
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
      command.myRecipesOnly,
    )
  })
}

export async function recalculatePlanDay(
  plan: Plan & { userId: number },
  userId: number,
  date: string,
) {
  return monitorService('plan_generation', 'recalculate_day', async () => {
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
  })
}

export async function rerollPlanMeal(
  plan: Plan & { userId: number },
  date: string,
  mealType: string,
  filters: { favoritesOnly: boolean; myRecipesOnly: boolean },
) {
  const [settings, daySlots, dayBonus, weekMealIds, repeatRows] =
    await Promise.all([
      getSettings(plan.userId),
      getDaySlotsWithNutrition(plan.id, date),
      getDayBonusNutrition(plan.id, date),
      getWeekMealIds(plan.id, mondayOf(date)),
      getSlotRepeats(plan.id),
    ])
  const current = daySlots.find((slot) => slot.mealType === mealType)
  if (current?.mealId == null) error(404, 'Slot not found')
  const candidates = await listCandidateMeals(plan.userId, {
    ...filters,
    cuisinePrefs: settings?.cuisinePrefs ?? [],
    dietaryRestrictions: settings?.dietaryRestrictions ?? [],
  })
  const history = withRepeatGroups(
    weekMealIds.filter((row) => row.date !== date || row.mealType !== mealType),
    repeatRows,
  )
  const [replacement] = fillDaySlots(
    plan.id,
    date,
    [mealType],
    candidates.filter((meal) => meal.id !== current.mealId),
    resolveTargets(settings),
    sumNutrition([
      ...daySlots.filter((slot) => slot.mealType !== mealType),
      ...dayBonus,
    ]),
    countMealUsage(history),
    history,
  )
  if (!replacement) return { changed: false }
  const changed = await replaceSingleSlot(
    plan.id,
    date,
    mealType,
    current.mealId,
    replacement.mealId,
  )
  if (!changed) error(409, 'Meal assignment changed. Please try again.')
  return { changed: true }
}
