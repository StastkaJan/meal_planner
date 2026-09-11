import { mealFitsSlot } from './meals'
import type { NutritionTargets } from '$lib/types'
import { addDays } from '$lib/utils/date-time'

export type CandidateMeal = {
  id: number
  // Stored nutrition is per serving; recipe servings/plan portions scale shopping only.
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

export type MealOccurrence = {
  date: string
  mealId?: number | null
  group?: string
}
type DatedNutritionRow = NutritionRow & MealOccurrence

// Calories inside this band are equally useful; macros and variety break ties.
// Outside it, prefer the closest attainable calories before trading for variety.
const CALORIE_TOLERANCE = 0.1
const REUSE_WEIGHT = 0.2
const calorieDistance = (calories: number | null, target: number) =>
  Math.abs((calories ?? 0) - target) / Math.max(target, 1)

export function countMealUsage(rows: MealOccurrence[]) {
  const counts = new Map<number, number>()
  const seen = new Set<string>()
  for (const [index, row] of rows.entries()) {
    if (row.mealId == null) continue
    const key = `${row.mealId}|${row.group ?? index}`
    if (seen.has(key)) continue
    seen.add(key)
    counts.set(row.mealId, (counts.get(row.mealId) ?? 0) + 1)
  }
  return counts
}

function nutritionDistance(
  meal: NutritionRow,
  calories: number,
  budget: MacroBudget,
) {
  const relative = calorieDistance(meal.calories, calories)
  return (
    Math.max(0, relative - CALORIE_TOLERANCE) * 5 +
    macroDistance(meal, budget) / 3
  )
}

function proximityPenalty(
  mealId: number,
  date: string,
  history: MealOccurrence[],
) {
  const yesterday = addDays(date, -1)
  const tomorrow = addDays(date, 1)
  return history.reduce(
    (score, row) =>
      score +
      (row.mealId !== mealId
        ? 0
        : row.date === date
          ? 0.6
          : row.date === yesterday || row.date === tomorrow
            ? 0.25
            : 0),
    0,
  )
}

// A stable per-slot seed removes catalogue ordering bias without flaky results.
function tieBreak(seed: string, mealId: number) {
  let hash = 2166136261
  for (const char of `${seed}|${mealId}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x45d9f3b)
  return hash >>> 0
}

const toNumber = (value: unknown) => Number(value ?? 0) || 0
export function macroDistance(meal: NutritionRow, budget: MacroBudget): number {
  const relativeDifference = (value: number, target: number) =>
    target > 0 ? Math.min(Math.abs(value - target) / target, 1) : 0
  return (
    relativeDifference(toNumber(meal.proteinG), budget.proteinG) +
    relativeDifference(toNumber(meal.carbsG), budget.carbsG) +
    relativeDifference(toNumber(meal.fatG), budget.fatG)
  )
}

export function rankByNutrition(
  candidates: CandidateMeal[],
  calorieBudget: number,
  budget: MacroBudget,
  usageCounts = new Map<number, number>(),
  seed = '',
): CandidateMeal[] {
  const score = nutritionScore(calorieBudget, budget, usageCounts)
  const limit = Math.max(
    CALORIE_TOLERANCE,
    Math.min(
      ...candidates.map((meal) =>
        calorieDistance(meal.calories, calorieBudget),
      ),
    ),
  )
  return candidates
    .map((meal) => ({
      meal,
      score: score(meal),
      outside: Number(calorieDistance(meal.calories, calorieBudget) > limit),
    }))
    .sort(
      (left, right) =>
        left.outside - right.outside ||
        left.score - right.score ||
        tieBreak(seed, left.meal.id) - tieBreak(seed, right.meal.id),
    )
    .map(({ meal }) => meal)
}

function nutritionScore(
  calorieBudget: number,
  budget: MacroBudget,
  usageCounts: Map<number, number>,
) {
  return (meal: CandidateMeal) => {
    return (
      nutritionDistance(meal, calorieBudget, budget) +
      (usageCounts.get(meal.id) ?? 0) * REUSE_WEIGHT
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
  history: MealOccurrence[] = [],
): { planId: number; date: string; mealType: string; mealId: number }[] {
  const rows: {
    planId: number
    date: string
    mealType: string
    mealId: number
  }[] = []
  const weight = (slot: string) =>
    slot === 'morning_snack' || slot === 'afternoon_snack'
      ? 1
      : slot === 'breakfast'
        ? 2
        : 3
  const eligible = emptySlots
    .map((mealType) => ({
      mealType,
      candidates: meals.filter((meal) =>
        mealFitsSlot(meal.allowedSlots, mealType),
      ),
    }))
    .filter((slot) => slot.candidates.length)
  let remaining = eligible.reduce(
    (total, slot) => total + weight(slot.mealType),
    0,
  )

  for (const { mealType, candidates: slotMeals } of eligible) {
    const share = weight(mealType) / remaining
    const calorieBudget =
      Math.max(0, targets.calories - consumed.calories) * share
    const macroBudget = {
      proteinG: Math.max(0, targets.proteinG - consumed.proteinG) * share,
      carbsG: Math.max(0, targets.carbsG - consumed.carbsG) * share,
      fatG: Math.max(0, targets.fatG - consumed.fatG) * share,
    }
    // The final slot (including reroll) can be assessed against the actual day,
    // so a small remaining budget must not turn a 5% daily miss into a 50% miss.
    const finalSlot = remaining === weight(mealType)
    const totalWith = (meal: CandidateMeal) => ({
      calories: consumed.calories + (meal.calories ?? 0),
      proteinG: consumed.proteinG + (meal.proteinG ?? 0),
      carbsG: consumed.carbsG + (meal.carbsG ?? 0),
      fatG: consumed.fatG + (meal.fatG ?? 0),
    })
    const nutrition = finalSlot
      ? (meal: CandidateMeal) =>
          nutritionDistance(totalWith(meal), targets.calories, targets) +
          (usageCounts.get(meal.id) ?? 0) * REUSE_WEIGHT
      : nutritionScore(calorieBudget, macroBudget, usageCounts)
    const calorieError = (meal: CandidateMeal) =>
      finalSlot
        ? calorieDistance(totalWith(meal).calories, targets.calories)
        : calorieDistance(meal.calories, calorieBudget)
    const score = (meal: CandidateMeal) =>
      nutrition(meal) + proximityPenalty(meal.id, date, [...history, ...rows])
    const seed = `${planId}|${date}|${mealType}`
    const limit = Math.max(
      CALORIE_TOLERANCE,
      Math.min(...slotMeals.map(calorieError)),
    )
    const fitting = slotMeals.filter((meal) => calorieError(meal) <= limit)
    let meal = fitting[0]
    let bestScore = score(meal)
    for (let i = 1; i < fitting.length; i++) {
      const candidateScore = score(fitting[i])
      if (
        candidateScore < bestScore ||
        (candidateScore === bestScore &&
          tieBreak(seed, fitting[i].id) < tieBreak(seed, meal.id))
      ) {
        meal = fitting[i]
        bestScore = candidateScore
      }
    }
    usageCounts.set(meal.id, (usageCounts.get(meal.id) ?? 0) + 1)
    rows.push({ planId, date, mealType, mealId: meal.id })
    consumed.calories += meal.calories ?? 0
    consumed.proteinG += meal.proteinG ?? 0
    consumed.carbsG += meal.carbsG ?? 0
    consumed.fatG += meal.fatG ?? 0
    remaining -= weight(mealType)
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
    const history: MealOccurrence[] = []
    const add = (
      date: string,
      meal: NutritionRow,
      mealId?: number | null,
      group?: string,
    ) => {
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
      if (mealId != null) history.push({ date, mealId, group })
    }
    for (const row of existing) add(row.date, row, row.mealId, row.group)
    for (const [index, row] of result.entries()) {
      if (excluded.has(index)) continue
      const meal = mealsById.get(row.mealId)
      if (meal) add(row.date, meal, meal.id, row.group)
    }
    const usage = countMealUsage(history)
    return (mealId: number) => {
      const meal = mealsById.get(mealId)
      // An intentional repeat group is one independent recipe choice.
      let totalScore = (usage.get(mealId) ?? 0) * REUSE_WEIGHT
      let calorieError = 0
      for (const [date, n] of dateCounts) {
        const total = byDate.get(date)
        calorieError = Math.max(
          calorieError,
          calorieDistance(
            (total?.calories ?? 0) + (meal?.calories ?? 0) * n,
            targets.calories,
          ),
        )
        totalScore +=
          (nutritionDistance(
            {
              calories: (total?.calories ?? 0) + (meal?.calories ?? 0) * n,
              proteinG: (total?.proteinG ?? 0) + toNumber(meal?.proteinG) * n,
              carbsG: (total?.carbsG ?? 0) + toNumber(meal?.carbsG) * n,
              fatG: (total?.fatG ?? 0) + toNumber(meal?.fatG) * n,
            },
            targets.calories,
            targets,
          ) +
            proximityPenalty(mealId, date, history)) /
          dateCounts.size
      }
      return { score: totalScore, calorieError }
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
      const options = [
        ...new Set([currentId, ...allowed.map((meal) => meal.id)]),
      ].map((id) => ({ id, ...score(id) }))
      const limit = Math.max(
        CALORIE_TOLERANCE,
        Math.min(...options.map((option) => option.calorieError)),
      )
      let best = options.filter((option) => option.calorieError <= limit)[0]
      const seed = `${result[indexes[0]].planId}|${result[indexes[0]].group}`
      for (const option of options) {
        if (option.calorieError > limit) continue
        if (
          option.score < best.score - 1e-12 ||
          (Math.abs(option.score - best.score) < 1e-12 &&
            tieBreak(seed, option.id) < tieBreak(seed, best.id))
        ) {
          best = option
        }
      }
      changed ||= best.id !== currentId
      for (const index of indexes) result[index].mealId = best.id
    }
    if (!changed) break
  }
  return result
}
