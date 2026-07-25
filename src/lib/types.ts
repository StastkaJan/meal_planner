import type { Meal, Plan, WeekSlot, BonusItem } from './schema'
import { MEAL_TYPES, NUTRITION_TARGETS } from './constants'

export type SlotWithMeal = WeekSlot & {
  mealName: string | null
  calories: number | null
  proteinG: string | null
  carbsG: string | null
  fatG: string | null
}

export type PlanDetail = Plan & { slots: SlotWithMeal[]; bonus: BonusItem[] }

export type MealWithFavorite = Meal & { isFavorite: boolean }

export type MealType = (typeof MEAL_TYPES)[number]

export type NutritionTargets = typeof NUTRITION_TARGETS
