import { pgTable, serial, text } from 'drizzle-orm/pg-core'

export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export type Ingredient = typeof ingredients.$inferSelect
