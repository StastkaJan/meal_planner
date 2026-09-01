export const MEAL_TYPES = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
] as const

export const UNIT_OPTIONS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'clove',
  'pinch',
  'slice',
  'can',
  'bunch',
  'handful',
] as const

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
