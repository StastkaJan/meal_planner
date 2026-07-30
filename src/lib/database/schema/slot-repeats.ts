import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core'
import { plans } from './plans'

export const slotRepeats = pgTable(
  'slot_repeats',
  {
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    mealType: text('meal_type').notNull(),
    groupBreaks: boolean('group_breaks').array().notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.mealType] })],
)

export type SlotRepeat = typeof slotRepeats.$inferSelect
