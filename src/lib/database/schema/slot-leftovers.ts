import {
  date,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core'
import { weekSlots } from './week-slots'

export const slotLeftovers = pgTable(
  'slot_leftovers',
  {
    planId: integer('plan_id').notNull(),
    date: date('date').notNull(),
    mealType: text('meal_type').notNull(),
    sourceDate: date('source_date').notNull(),
    sourceMealType: text('source_meal_type').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.date, table.mealType] }),
    foreignKey({
      columns: [table.planId, table.date, table.mealType],
      foreignColumns: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.planId, table.sourceDate, table.sourceMealType],
      foreignColumns: [weekSlots.planId, weekSlots.date, weekSlots.mealType],
    }).onDelete('cascade'),
  ],
)

export type SlotLeftover = typeof slotLeftovers.$inferSelect
