import { requireUser } from '$lib/server/guards'
import { exportAccountData } from '$lib/server/services/profile'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const { id } = requireUser(locals)
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), ...(await exportAccountData(id)) },
    null,
    2,
  )
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="meal-plan-data.json"',
      'cache-control': 'no-store',
    },
  })
}
