import { sql } from 'drizzle-orm'
import { db } from '$lib/database'

export async function checkDatabase() {
  await db.execute(sql`select 1`)
}
