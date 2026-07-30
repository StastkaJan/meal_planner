import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
} from 'drizzle-orm/pg-core'
import { plans } from './plans'

export const bonusItems = pgTable('bonus_items', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  name: text('name').notNull(),
  calories: integer('calories'),
  proteinG: numeric('protein_g', { precision: 6, scale: 1 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 1 }),
  fatG: numeric('fat_g', { precision: 6, scale: 1 }),
})

export type BonusItem = typeof bonusItems.$inferSelect
