import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  legalAcceptedAt: timestamp('legal_accepted_at').notNull(),
  legalVersion: text('legal_version').notNull(),
})

export type User = typeof users.$inferSelect
