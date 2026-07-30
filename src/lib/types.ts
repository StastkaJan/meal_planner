import type { Meal, Plan, WeekSlot, BonusItem, SlotRepeat } from './schema'
import { MEAL_TYPES, NUTRITION_TARGETS } from './constants'

export type SlotWithMeal = WeekSlot & {
  mealName: string | null
  calories: number | null
  proteinG: string | null
  carbsG: string | null
  fatG: string | null
}

export type PlanDetail = Plan & {
  slots: SlotWithMeal[]
  bonus: BonusItem[]
  slotRepeats: Pick<SlotRepeat, 'mealType' | 'groupBreaks'>[]
}

export type MealWithFavorite = Meal & { isFavorite: boolean }

export type IngredientInput = {
  name: string
  qty: number | null
  unit: string | null
}

export type MealType = (typeof MEAL_TYPES)[number]

export type NutritionTargets = typeof NUTRITION_TARGETS

export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  instructions?: string
  calories?: number
  timeMinutes?: number
}
