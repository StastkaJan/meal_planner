import { sql } from 'drizzle-orm'
import { integer, pgTable, text } from 'drizzle-orm/pg-core'
import { users } from './users'

export const userSettings = pgTable('user_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  cuisinePrefs: text('cuisine_prefs')
    .array()
    .notNull()
    .default(sql`'{}'`),
  dietaryRestrictions: text('dietary_restrictions')
    .array()
    .notNull()
    .default(sql`'{}'`),
  calorieTarget: integer('calorie_target'),
  proteinTarget: integer('protein_target'),
  carbsTarget: integer('carbs_target'),
  fatTarget: integer('fat_target'),
})

export type UserSettings = typeof userSettings.$inferSelect
