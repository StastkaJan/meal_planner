import type { Meal, Plan, WeekSlot } from './schema'

export type SlotWithMeal = WeekSlot & {
  mealName: string | null
  calories: number | null
  proteinG: string | null
  carbsG: string | null
  fatG: string | null
}

export type PlanDetail = Plan & { slots: SlotWithMeal[] }

export const MEAL_TYPES = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const

export function mealFitsSlot(
  allowedSlots: string[],
  mealType: string,
): boolean {
  return !allowedSlots.length || allowedSlots.includes(mealType)
}

export const DIFF_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const CUISINE_OPTIONS = [
  'Italian',
  'Chinese',
  'Japanese',
  'Mexican',
  'Indian',
  'Mediterranean',
  'Thai',
  'American',
]
// Vegetarian/Vegan are diet styles, not cuisines — kept here so auto-compose treats them
// as AND-match restrictions ("only vegan meals"), not OR-match cuisine preferences.
export const DIET_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'no_lactose',
  'no_gluten',
  'no_fiber',
  'no_nuts',
  'no_eggs',
  'low_carb',
  'low_fat',
  'high_protein',
]

export const NUTRITION_TARGETS = {
  calories: 2000,
  proteinG: 50,
  carbsG: 250,
  fatG: 65,
}
export type NutritionTargets = typeof NUTRITION_TARGETS

// Per-user targets fall back to the global defaults for any column left NULL.
type UserTargets = {
  calorieTarget: number | null
  proteinTarget: number | null
  carbsTarget: number | null
  fatTarget: number | null
}
export function resolveTargets(u?: UserTargets | null): NutritionTargets {
  return {
    calories: u?.calorieTarget ?? NUTRITION_TARGETS.calories,
    proteinG: u?.proteinTarget ?? NUTRITION_TARGETS.proteinG,
    carbsG: u?.carbsTarget ?? NUTRITION_TARGETS.carbsG,
    fatG: u?.fatTarget ?? NUTRITION_TARGETS.fatG,
  }
}
