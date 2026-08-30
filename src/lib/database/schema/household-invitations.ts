import { boolean, integer, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const householdInvitations = pgTable(
  'household_invitations',
  {
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    canEdit: boolean('can_edit').notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
)

export type HouseholdInvitation = typeof householdInvitations.$inferSelect
