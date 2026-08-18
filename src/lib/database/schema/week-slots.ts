import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { meals } from './meals'
import { plans } from './plans'

export const weekSlots = pgTable(
  'week_slots',
  {
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    mealType: text('meal_type').notNull(),
    mealId: integer('meal_id').references(() => meals.id, {
      onDelete: 'set null',
    }),
    outcome: text('outcome'),
    rating: integer('rating'),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.date, table.mealType] }),
    check(
      'week_slots_outcome_check',
      sql`${table.outcome} is null or ${table.outcome} in ('cooked', 'skipped')`,
    ),
    check(
      'week_slots_rating_check',
      sql`${table.rating} is null or (${table.rating} between 1 and 5 and ${table.outcome} = 'cooked')`,
    ),
  ],
)

export type WeekSlot = typeof weekSlots.$inferSelect
