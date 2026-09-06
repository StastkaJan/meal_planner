import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
} from 'drizzle-orm/pg-core'
import { ingredients } from './ingredients'
import { meals } from './meals'

export const mealIngredients = pgTable(
  'meal_ingredients',
  {
    id: serial('id').primaryKey(),
    mealId: integer('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    position: integer('position').notNull(),
    qty: numeric('qty', { precision: 10, scale: 3 }),
    unit: text('unit'),
  },
  (table) => [
    index('meal_ingredients_meal_position_idx').on(
      table.mealId,
      table.position,
    ),
  ],
)

export type MealIngredient = typeof mealIngredients.$inferSelect
