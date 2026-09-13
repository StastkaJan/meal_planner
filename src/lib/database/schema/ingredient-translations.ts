import { sql } from 'drizzle-orm'
import { index, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
import { ingredients } from './ingredients'

export const ingredientTranslations = pgTable(
  'ingredient_translations',
  {
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    // Store aliases normalized with normalizeIngredientName for indexed matching.
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`'{}'`),
  },
  (table) => [
    primaryKey({ columns: [table.ingredientId, table.locale] }),
    index('ingredient_translations_name_idx').on(
      sql`lower(regexp_replace(trim(${table.name}), '\\s+', ' ', 'g'))`,
    ),
    index('ingredient_translations_aliases_idx').using('gin', table.aliases),
  ],
)
