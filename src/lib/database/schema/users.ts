import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  termsAcceptedAt: timestamp('terms_accepted_at'),
  termsVersion: text('terms_version'),
  privacyAcknowledgedAt: timestamp('privacy_acknowledged_at'),
  privacyVersion: text('privacy_version'),
})

export type User = typeof users.$inferSelect
