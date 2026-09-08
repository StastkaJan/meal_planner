import { json } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { saveExtra } from '$lib/server/repositories/extras'
import { parseExtra } from '$lib/server/services/extras'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals)
  const fields = parseExtra(await request.json().catch(() => ({})))
  return json(await saveExtra(user.id, fields), { status: 201 })
}
