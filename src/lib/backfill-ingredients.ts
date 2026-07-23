// One-time backfill for the 0010_volatile_zaran migration: populates mealIngredients for
// meals that existed before that migration (syncMealIngredients only runs on meal
// create/update, so pre-existing rows never got synced otherwise). Idempotent — safe to
// run more than once, and safe to run even if some meals are already synced.
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'
import { meals } from './schema.js'
import { syncMealIngredients } from './server/meals.js'

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://mealplan:mealplan@localhost:5432/mealplan',
})
const db = drizzle(pool, { schema })

const rows = await db
  .select({ id: meals.id, ingredients: meals.ingredients })
  .from(meals)

await db.transaction(async (tx) => {
  for (const m of rows) {
    await syncMealIngredients(tx, m.id, m.ingredients)
  }
})

console.log(`Backfilled ingredient links for ${rows.length} meal(s).`)
await pool.end()
