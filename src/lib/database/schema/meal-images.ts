import { customType, integer, pgTable, text } from 'drizzle-orm/pg-core'
import { meals } from './meals'

const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
})

export const mealImages = pgTable('meal_images', {
  mealId: integer('meal_id')
    .primaryKey()
    .references(() => meals.id, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull(),
  data: bytea('data').notNull(),
})

export type MealImage = typeof mealImages.$inferSelect
