import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { checkDatabase } from '$lib/server/repositories/health'
import { release } from '$lib/server/release'

export const GET: RequestHandler = async () => {
  try {
    await checkDatabase()
    return json({ status: 'ok', release })
  } catch {
    return json({ status: 'unhealthy', release }, { status: 503 })
  }
}
