import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { meals } from './meals'
import { users } from './users'

export const mealFavorites = pgTable(
  'meal_favorites',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mealId: integer('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mealId] })],
)

export type MealFavorite = typeof mealFavorites.$inferSelect
