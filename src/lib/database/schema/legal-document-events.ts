import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const legalDocumentEvents = pgTable(
  'legal_document_events',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    document: text('document').notNull(),
    version: text('version').notNull(),
    action: text('action').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.document, table.version] }),
  ],
)

export type LegalDocumentEvent = typeof legalDocumentEvents.$inferSelect
