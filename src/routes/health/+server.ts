import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { checkDatabase } from '$lib/server/repositories/health'

export const GET: RequestHandler = async () => {
  try {
    await checkDatabase()
    return json({ status: 'ok' })
  } catch {
    return json({ status: 'unhealthy' }, { status: 503 })
  }
}
