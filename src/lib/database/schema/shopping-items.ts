import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core'
import { plans } from './plans'

export const shoppingItems = pgTable(
  'shopping_items',
  {
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    week: date('week').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    unit: text('unit'),
    aisle: text('aisle').notNull().default('Other'),
    checked: boolean('checked').notNull().default(false),
    excluded: boolean('excluded').notNull().default(false),
    custom: boolean('custom').notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.planId, table.week, table.key] })],
)

export type ShoppingItem = typeof shoppingItems.$inferSelect
