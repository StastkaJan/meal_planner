import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const passwordResets = pgTable('password_resets', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})
