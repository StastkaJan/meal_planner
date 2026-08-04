import type { NutritionTargets } from '$lib/types'

export const NUTRITION_TARGETS: NutritionTargets = {
  calories: 2000,
  proteinG: 50,
  carbsG: 250,
  fatG: 65,
}

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
