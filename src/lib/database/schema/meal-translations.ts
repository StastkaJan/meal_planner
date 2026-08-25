import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
import { meals } from './meals'

export const mealTranslations = pgTable(
  'meal_translations',
  {
    mealId: integer('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name'),
    description: text('description'),
    instructions: text('instructions'),
  },
  (table) => [primaryKey({ columns: [table.mealId, table.locale] })],
)

export type MealTranslation = typeof mealTranslations.$inferSelect
