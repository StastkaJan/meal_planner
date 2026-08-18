import { mealFitsSlot } from './meals'
import type { NutritionTargets } from '$lib/types'

export type CandidateMeal = {
  id: number
  calories: number | null
  tags: string[]
  allowedSlots: string[]
  proteinG?: number
  carbsG?: number
  fatG?: number
  feedbackPenalty?: number
  recentUses?: number
}

export type MacroBudget = {
  proteinG: number
  carbsG: number
  fatG: number
}

export type Consumed = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

type NutritionRow = {
  calories: number | null
  proteinG?: string | number | null
  carbsG?: string | number | null
  fatG?: string | number | null
}

export type OptimizableSlot = {
  planId: number
  date: string
  mealType: string
  mealId: number
  group: string
  locked?: boolean
}

type DatedNutritionRow = NutritionRow & { date: string; mealId?: number | null }

const toNumber = (value: unknown) => Number(value ?? 0) || 0
export function macroDistance(
  meal: CandidateMeal,
  budget: MacroBudget,
): number {
  const relativeDifference = (value: number, target: number) =>
    target > 0 ? Math.min(Math.abs(value - target) / target, 1) : 0
  return (
    relativeDifference(meal.proteinG ?? 0, budget.proteinG) +
    relativeDifference(meal.carbsG ?? 0, budget.carbsG) +
    relativeDifference(meal.fatG ?? 0, budget.fatG)
  )
}

export function rankByNutrition(
  candidates: CandidateMeal[],
  calorieBudget: number,
  budget: MacroBudget,
  usageCounts = new Map<number, number>(),
): CandidateMeal[] {
  const score = (meal: CandidateMeal) => {
    const calorieDistance =
      Math.abs((meal.calories ?? 0) - calorieBudget) /
      Math.max(calorieBudget, 1)
    return (
      calorieDistance * 5 +
      macroDistance(meal, budget) / 3 +
      Math.log2((usageCounts.get(meal.id) ?? 0) + (meal.recentUses ?? 0) + 1) *
        0.4 +
      (meal.feedbackPenalty ?? 0)
    )
  }
  return [...candidates].sort((left, right) => score(left) - score(right))
}

export function filterByPrefs(
  meals: CandidateMeal[],
  cuisinePrefs: string[],
  dietaryRestrictions: string[],
): CandidateMeal[] {
  let filtered = meals
  if (cuisinePrefs.length)
    filtered = filtered.filter((meal) =>
      meal.tags.some((tag) => cuisinePrefs.includes(tag)),
    )
  if (dietaryRestrictions.length)
    filtered = filtered.filter((meal) =>
      dietaryRestrictions.every((restriction) =>
        meal.tags.includes(restriction),
      ),
    )
  return filtered.length ? filtered : meals
}

export function sumNutrition(rows: NutritionRow[]): Consumed {
  return {
    calories: rows.reduce((sum, row) => sum + (row.calories ?? 0), 0),
    proteinG: rows.reduce((sum, row) => sum + toNumber(row.proteinG), 0),
    carbsG: rows.reduce((sum, row) => sum + toNumber(row.carbsG), 0),
    fatG: rows.reduce((sum, row) => sum + toNumber(row.fatG), 0),
  }
}

export function fillDaySlots(
  planId: number,
  date: string,
  emptySlots: readonly string[],
  meals: CandidateMeal[],
  targets: NutritionTargets,
  consumed: Consumed,
  usageCounts: Map<number, number>,
): { planId: number; date: string; mealType: string; mealId: number }[] {
  const rows: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[] = []
  let remaining = emptySlots.length

  for (const mealType of emptySlots) {
    const slotMeals = meals.filter((meal) =>
      mealFitsSlot(meal.allowedSlots, mealType),
    )
    if (!slotMeals.length) {
      remaining--
      continue
    }
    const calorieBudget = (targets.calories - consumed.calories) / remaining
    const macroBudget = {
      proteinG: (targets.proteinG - consumed.proteinG) / remaining,
      carbsG: (targets.carbsG - consumed.carbsG) / remaining,
      fatG: (targets.fatG - consumed.fatG) / remaining,
    }
    const [meal] = rankByNutrition(
      slotMeals,
      calorieBudget,
      macroBudget,
      usageCounts,
    )
    usageCounts.set(meal.id, (usageCounts.get(meal.id) ?? 0) + 1)
    rows.push({ planId, date, mealType, mealId: meal.id })
    consumed.calories += meal.calories ?? 0
    consumed.proteinG += meal.proteinG ?? 0
    consumed.carbsG += meal.carbsG ?? 0
    consumed.fatG += meal.fatG ?? 0
    remaining--
  }

  return rows
}

export function optimizeWeekSlots(
  slots: OptimizableSlot[],
  candidates: CandidateMeal[],
  visibleMeals: CandidateMeal[],
  targets: NutritionTargets,
  existing: DatedNutritionRow[],
): OptimizableSlot[] {
  if (!slots.length || !candidates.length) return slots
  const mealsById = new Map(visibleMeals.map((meal) => [meal.id, meal]))
  const score = (rows: OptimizableSlot[]) => {
    const byDate = new Map<string, Consumed>()
    const usage = new Map<number, number>()
    const add = (date: string, meal: NutritionRow, mealId?: number | null) => {
      const total = byDate.get(date) ?? {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      }
      total.calories += meal.calories ?? 0
      total.proteinG += toNumber(meal.proteinG)
      total.carbsG += toNumber(meal.carbsG)
      total.fatG += toNumber(meal.fatG)
      byDate.set(date, total)
      if (mealId != null) usage.set(mealId, (usage.get(mealId) ?? 0) + 1)
    }
    for (const row of existing) add(row.date, row, row.mealId)
    for (const row of rows) {
      const meal = mealsById.get(row.mealId)
      if (meal) add(row.date, meal, meal.id)
    }
    const distance = (value: number, target: number) =>
      target > 0 ? Math.abs(value - target) / target : 0
    let totalScore = 0
    for (const total of byDate.values()) {
      totalScore +=
        distance(total.calories, targets.calories) * 5 +
        (distance(total.proteinG, targets.proteinG) +
          distance(total.carbsG, targets.carbsG) +
          distance(total.fatG, targets.fatG)) /
          3
    }
    for (const count of usage.values())
      totalScore += Math.max(0, count - 1) * 0.15
    for (const row of rows)
      totalScore +=
        (mealsById.get(row.mealId)?.feedbackPenalty ?? 0) +
        Math.log2((mealsById.get(row.mealId)?.recentUses ?? 0) + 1) * 0.4
    return totalScore
  }

  const result = slots.map((slot) => ({ ...slot }))
  const groups = Map.groupBy(result.keys(), (index) => result[index].group)
  // ponytail: two coordinate-descent passes; use beam search only if measured
  // plans get stuck in poor local optima.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (const indexes of groups.values()) {
      if (indexes.some((index) => result[index].locked)) continue
      const allowed = candidates.filter((meal) =>
        mealFitsSlot(meal.allowedSlots, result[indexes[0]].mealType),
      )
      const currentId = result[indexes[0]].mealId
      let bestId = currentId
      let bestScore = score(result)
      for (const meal of allowed) {
        for (const index of indexes) result[index].mealId = meal.id
        const candidateScore = score(result)
        if (candidateScore < bestScore) {
          bestId = meal.id
          bestScore = candidateScore
        }
      }
      changed ||= bestId !== currentId
      for (const index of indexes) result[index].mealId = bestId
    }
    if (!changed) break
  }
  return result
}
