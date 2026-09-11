import { sql } from 'drizzle-orm'
import { boolean, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  nameCs: text('name_cs'),
  aliases: text('aliases')
    .array()
    .notNull()
    .default(sql`'{}'`),
  isCatalog: boolean('is_catalog').notNull().default(false),
})

export type Ingredient = typeof ingredients.$inferSelect
