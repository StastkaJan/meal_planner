import { mealFitsSlot } from '$lib/constants'
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
  proteinG: string | null
  carbsG: string | null
  fatG: string | null
}

const toNumber = (value: unknown) => Number(value ?? 0) || 0
const pick = <T>(values: T[]) =>
  values[Math.floor(Math.random() * values.length)]

export function pickUnused(
  candidates: CandidateMeal[],
  used: Set<number>,
): CandidateMeal {
  const unused = candidates.filter((meal) => !used.has(meal.id))
  return pick(unused.length ? unused : candidates)
}

export function candidateMeals(
  meals: CandidateMeal[],
  budget: number,
): CandidateMeal[] {
  const fitting = meals.filter((meal) => (meal.calories ?? 0) <= budget * 1.3)
  return fitting.length
    ? fitting
    : [...meals]
        .sort((left, right) => (left.calories ?? 0) - (right.calories ?? 0))
        .slice(0, 3)
}

export function macroDistance(
  meal: CandidateMeal,
  budget: MacroBudget,
): number {
  const relativeDifference = (value: number, target: number) =>
    target > 0 ? Math.abs(value - target) / target : 0
  return (
    relativeDifference(meal.proteinG ?? 0, budget.proteinG) +
    relativeDifference(meal.carbsG ?? 0, budget.carbsG) +
    relativeDifference(meal.fatG ?? 0, budget.fatG)
  )
}

export function rankByMacros(
  candidates: CandidateMeal[],
  budget: MacroBudget,
  count = 3,
): CandidateMeal[] {
  return [...candidates]
    .sort(
      (left, right) =>
        macroDistance(left, budget) - macroDistance(right, budget),
    )
    .slice(0, Math.max(1, count))
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
  used: Set<number>,
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
    const calorieMatches = candidateMeals(
      slotMeals,
      (targets.calories - consumed.calories) / remaining,
    )
    const macroBudget = {
      proteinG: (targets.proteinG - consumed.proteinG) / remaining,
      carbsG: (targets.carbsG - consumed.carbsG) / remaining,
      fatG: (targets.fatG - consumed.fatG) / remaining,
    }
    const meal = pickUnused(rankByMacros(calorieMatches, macroBudget), used)
    used.add(meal.id)
    rows.push({ planId, date, mealType, mealId: meal.id })
    consumed.calories += meal.calories ?? 0
    consumed.proteinG += meal.proteinG ?? 0
    consumed.carbsG += meal.carbsG ?? 0
    consumed.fatG += meal.fatG ?? 0
    remaining--
  }

  return rows
}
