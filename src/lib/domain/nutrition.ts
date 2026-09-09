import type { DailyNutritionTargets } from '$lib/types'

export const NUTRITION_TARGETS: DailyNutritionTargets = {
  calories: 2000,
  proteinG: 50,
  carbsG: 250,
  fatG: 65,
  fiberG: 30,
  sugarG: 90,
  saturatedFatG: 20,
  saltG: 6,
}

export const nutritionProgress = (value: number, target: number) => ({
  percent: Math.min(100, Math.round((value / target) * 100)),
  wayOver: value >= target * 1.2,
})

type UserTargets = {
  calorieTarget: number | null
  proteinTarget: number | null
  carbsTarget: number | null
  fatTarget: number | null
  fiberTarget?: number | null
  sugarTarget?: number | null
  saturatedFatTarget?: number | null
  saltTarget?: number | null
}

export function resolveTargets(
  user?: UserTargets | null,
): DailyNutritionTargets {
  return {
    calories: user?.calorieTarget ?? NUTRITION_TARGETS.calories,
    proteinG: user?.proteinTarget ?? NUTRITION_TARGETS.proteinG,
    carbsG: user?.carbsTarget ?? NUTRITION_TARGETS.carbsG,
    fatG: user?.fatTarget ?? NUTRITION_TARGETS.fatG,
    fiberG: user?.fiberTarget ?? NUTRITION_TARGETS.fiberG,
    sugarG: user?.sugarTarget ?? NUTRITION_TARGETS.sugarG,
    saturatedFatG: user?.saturatedFatTarget ?? NUTRITION_TARGETS.saturatedFatG,
    saltG: user?.saltTarget ?? NUTRITION_TARGETS.saltG,
  }
}
