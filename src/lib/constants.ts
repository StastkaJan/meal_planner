export const MEAL_TYPES = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
] as const

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const

export const PLAN_MODES = ['simple', 'calendar'] as const

// zero-padded 24h "HH:MM", matching what <input type="time"> emits — zero-padding is
// what makes plain string sort double as chronological sort for calendar-mode slots
export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

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

type NutritionTargets = typeof NUTRITION_TARGETS
