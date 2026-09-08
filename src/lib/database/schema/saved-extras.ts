import {
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const savedExtras = pgTable(
  'saved_extras',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    calories: integer('calories'),
    proteinG: doublePrecision('protein_g'),
    carbsG: doublePrecision('carbs_g'),
    fatG: doublePrecision('fat_g'),
    fiberG: doublePrecision('fiber_g'),
    sugarG: doublePrecision('sugar_g'),
    saturatedFatG: doublePrecision('saturated_fat_g'),
    saltG: doublePrecision('salt_g'),
  },
  (table) => [index('saved_extras_user_id_idx').on(table.userId)],
)

export type SavedExtra = typeof savedExtras.$inferSelect
