import type { Meal, Plan, WeekSlot } from './schema';

export type SlotWithMeal = WeekSlot & {
  mealName: string | null;
  calories: number | null;
  proteinG: string | null;
  carbsG:   string | null;
  fatG:     string | null;
};

export type PlanDetail = Plan & { slots: SlotWithMeal[] };

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealType = typeof MEAL_TYPES[number];

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Day = typeof DAYS[number];

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CUISINE_OPTIONS = ['Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'Mediterranean', 'Thai', 'Vegetarian', 'Vegan', 'American'];
export const DIET_OPTIONS     = ['no_lactose', 'no_gluten', 'no_fiber', 'no_nuts', 'no_eggs', 'low_carb', 'low_fat', 'high_protein'];

export const NUTRITION_TARGETS = { calories: 2000, proteinG: 50, carbsG: 250, fatG: 65 };
