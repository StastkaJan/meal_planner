import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const pricingInterests = pgTable('pricing_interests', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  billingInterval: text('billing_interval').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type PricingInterest = typeof pricingInterests.$inferSelect
