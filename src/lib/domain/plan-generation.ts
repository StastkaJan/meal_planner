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
  const score = nutritionScore(calorieBudget, budget, usageCounts)
  return candidates
    .map((meal) => ({ meal, score: score(meal) }))
    .sort((left, right) => left.score - right.score)
    .map(({ meal }) => meal)
}

function nutritionScore(
  calorieBudget: number,
  budget: MacroBudget,
  usageCounts: Map<number, number>,
) {
  return (meal: CandidateMeal) => {
    const calorieDistance =
      Math.abs((meal.calories ?? 0) - calorieBudget) /
      Math.max(calorieBudget, 1)
    return (
      calorieDistance * 5 +
      macroDistance(meal, budget) / 3 +
      Math.log2((usageCounts.get(meal.id) ?? 0) + 1) * 0.4
    )
  }
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
    const score = nutritionScore(calorieBudget, macroBudget, usageCounts)
    let meal = slotMeals[0]
    let bestScore = score(meal)
    for (let i = 1; i < slotMeals.length; i++) {
      const candidateScore = score(slotMeals[i])
      if (candidateScore < bestScore) {
        meal = slotMeals[i]
        bestScore = candidateScore
      }
    }
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
  const result = slots.map((slot) => ({ ...slot }))
  const groups = Map.groupBy(result.keys(), (index) => result[index].group)
  const allowedByType = new Map(
    [...new Set(slots.map(({ mealType }) => mealType))].map((mealType) => [
      mealType,
      candidates.filter((meal) => mealFitsSlot(meal.allowedSlots, mealType)),
    ]),
  )

  // Score only the dates and usage counts affected by the current group.
  const groupScore = (indexes: number[]) => {
    const excluded = new Set(indexes)
    const dateCounts = new Map<string, number>()
    for (const index of indexes) {
      const date = result[index].date
      dateCounts.set(date, (dateCounts.get(date) ?? 0) + 1)
    }
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
    for (const [index, row] of result.entries()) {
      if (excluded.has(index)) continue
      const meal = mealsById.get(row.mealId)
      if (meal) add(row.date, meal, meal.id)
    }
    const distance = (value: number, target: number) =>
      target > 0 ? Math.abs(value - target) / target : 0
    return (mealId: number) => {
      const meal = mealsById.get(mealId)
      const count = usage.get(mealId) ?? 0
      let totalScore = meal
        ? (Math.max(0, count + indexes.length - 1) - Math.max(0, count - 1)) *
          0.15
        : 0
      for (const [date, n] of dateCounts) {
        const total = byDate.get(date)
        totalScore +=
          distance(
            (total?.calories ?? 0) + (meal?.calories ?? 0) * n,
            targets.calories,
          ) *
            5 +
          (distance(
            (total?.proteinG ?? 0) + toNumber(meal?.proteinG) * n,
            targets.proteinG,
          ) +
            distance(
              (total?.carbsG ?? 0) + toNumber(meal?.carbsG) * n,
              targets.carbsG,
            ) +
            distance(
              (total?.fatG ?? 0) + toNumber(meal?.fatG) * n,
              targets.fatG,
            )) /
            3
      }
      return totalScore
    }
  }
  // ponytail: two coordinate-descent passes; use beam search only if measured
  // plans get stuck in poor local optima.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (const indexes of groups.values()) {
      if (indexes.some((index) => result[index].locked)) continue
      const allowed = allowedByType.get(result[indexes[0]].mealType)!
      const score = groupScore(indexes)
      const currentId = result[indexes[0]].mealId
      let bestId = currentId
      let bestScore = score(currentId)
      for (const meal of allowed) {
        const candidateScore = score(meal.id)
        if (candidateScore < bestScore - 1e-12) {
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
