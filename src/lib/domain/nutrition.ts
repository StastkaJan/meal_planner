import type { NutritionTargets } from '$lib/types'

export const NUTRITION_TARGETS: NutritionTargets = {
  calories: 2000,
  proteinG: 50,
  carbsG: 250,
  fatG: 65,
}

// Display references for nutrients that are tracked but are not auto-compose targets.
export const NUTRITION_DISPLAY_REFERENCES = {
  fiberG: 30,
  sugarG: 90,
  saturatedFatG: 20,
  saltG: 6,
} as const

export const nutritionProgress = (value: number, target: number) => ({
  percent: Math.min(100, Math.round((value / target) * 100)),
  wayOver: value >= target * 1.2,
})

type UserTargets = {
  calorieTarget: number | null
  proteinTarget: number | null
  carbsTarget: number | null
  fatTarget: number | null
}

export function resolveTargets(user?: UserTargets | null): NutritionTargets {
  return {
    calories: user?.calorieTarget ?? NUTRITION_TARGETS.calories,
    proteinG: user?.proteinTarget ?? NUTRITION_TARGETS.proteinG,
    carbsG: user?.carbsTarget ?? NUTRITION_TARGETS.carbsG,
    fatG: user?.fatTarget ?? NUTRITION_TARGETS.fatG,
  }
}
