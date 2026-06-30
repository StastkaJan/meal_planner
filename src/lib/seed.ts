import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { plans } from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://mealplan:mealplan@localhost:5432/mealplan'
});
const db = drizzle(pool);

const existing = await db.select().from(plans).limit(1);
if (existing.length === 0) {
  await db.insert(plans).values({ name: 'Week 1' });
  console.log('Seeded default plan.');
} else {
  console.log('Seed skipped — data exists.');
}
await pool.end();
