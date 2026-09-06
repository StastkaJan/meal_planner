import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'
import { assertPreviewSeedTarget, seedPreviewAccounts } from './preview-seed'

assertPreviewSeedTarget(process.env)
await import('./seed.js')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
try {
  const count = await seedPreviewAccounts(drizzle(pool, { schema }))
  console.log(`Created ${count} demo accounts with personal recipes and plans.`)
} finally {
  await pool.end()
}
