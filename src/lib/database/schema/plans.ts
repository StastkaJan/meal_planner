import { sql } from 'drizzle-orm'
import { date, integer, pgTable, serial, text } from 'drizzle-orm/pg-core'
import { users } from './users'

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, {
      onDelete: 'cascade',
    })
    .unique(),
  name: text('name').notNull().default('New Plan'),
  weekStart: date('week_start')
    .notNull()
    .default(sql`CURRENT_DATE`),
  cuisinePrefs: text('cuisine_prefs')
    .array()
    .notNull()
    .default(sql`'{}'`),
  dietaryRestrictions: text('dietary_restrictions')
    .array()
    .notNull()
    .default(sql`'{}'`),
})

export type Plan = typeof plans.$inferSelect
