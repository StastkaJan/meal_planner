import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { ingredients } from './ingredients'
import { users } from './users'

export const userIngredients = pgTable(
  'user_ingredients',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.ingredientId] })],
)
