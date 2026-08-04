import { date, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
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
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.date, table.mealType] }),
  ],
)

export type WeekSlot = typeof weekSlots.$inferSelect
