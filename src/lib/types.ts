import type {
  Meal,
  Plan,
  WeekSlot,
  BonusItem,
  SlotRepeat,
} from './database/schema'
import { MEAL_TYPES } from './constants'

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

export type NutritionTargets = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type ImportedRecipe = {
  name?: string
  description?: string
  imageUrl?: string
  ingredients?: IngredientInput[]
  instructions?: string
  calories?: number
  timeMinutes?: number
}
