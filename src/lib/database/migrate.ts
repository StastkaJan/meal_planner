import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
} finally {
  await pool.end()
}
