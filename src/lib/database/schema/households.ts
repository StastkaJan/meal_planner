import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'
import { users } from './users'

export const households = pgTable('households', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
})

export type Household = typeof households.$inferSelect
