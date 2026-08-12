import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { meals } from './meals'
import { users } from './users'

export type CatalogueRecipe = Record<string, unknown> & {
  name: string
  ingredients: { name: string; qty: number | null; unit: string | null }[]
  instructions: string
  description?: string
}

export const recipeImports = pgTable(
  'recipe_imports',
  {
    id: serial('id').primaryKey(),
    submittedBy: integer('submitted_by')
      .notNull()
      .references(() => users.id),
    contentHash: text('content_hash').notNull(),
    recipe: jsonb('recipe').$type<CatalogueRecipe>().notNull(),
    status: text('status').notNull().default('pending'),
    mealId: integer('meal_id').references(() => meals.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at'),
  },
  (table) => [
    uniqueIndex('recipe_imports_content_hash_unique').on(table.contentHash),
  ],
)

export type RecipeImport = typeof recipeImports.$inferSelect
