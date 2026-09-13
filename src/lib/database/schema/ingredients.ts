import { sql } from 'drizzle-orm'
import { boolean, index, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const ingredients = pgTable(
  'ingredients',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    // Retained for rollback to the bilingual catalogue; use ingredientTranslations.
    nameCs: text('name_cs'),
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`'{}'`),
    isCatalog: boolean('is_catalog').notNull().default(false),
  },
  (table) => [
    index('ingredients_normalized_name_idx').on(
      sql`lower(regexp_replace(trim(${table.name}), '\\s+', ' ', 'g'))`,
    ),
  ],
)

export type Ingredient = typeof ingredients.$inferSelect
