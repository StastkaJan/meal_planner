import { sql } from 'drizzle-orm'
import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const meals = pgTable('meals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  sourceLocale: text('source_locale').notNull().default('en'),
  name: text('name').notNull(),
  calories: integer('calories'),
  proteinG: numeric('protein_g', { precision: 6, scale: 1 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 1 }),
  fatG: numeric('fat_g', { precision: 6, scale: 1 }),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`'{}'`),
  allowedSlots: text('allowed_slots')
    .array()
    .notNull()
    .default(sql`'{}'`),
  imageUrl: text('image_url'),
  description: text('description'),
  instructions: text('instructions'),
  timeMinutes: integer('time_minutes'),
  difficulty: text('difficulty'),
  servings: integer('servings').notNull().default(1),
  archivedAt: timestamp('archived_at'),
})

export type Meal = typeof meals.$inferSelect
