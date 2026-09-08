import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { deleteSavedExtra } from '$lib/server/repositories/extras'
import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const user = requireUser(locals)
  const id = Number(params.id)
  if (!Number.isSafeInteger(id) || id < 1) error(404, 'Extra not found')
  if (!(await deleteSavedExtra(user.id, id))) error(404, 'Extra not found')
  return new Response(null, { status: 204 })
}
