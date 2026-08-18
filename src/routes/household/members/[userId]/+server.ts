import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import {
  removeMember,
  setMemberPermission,
} from '$lib/server/services/households'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const { id } = requireUser(locals)
  const memberId = Number(params.userId)
  if (
    !(await setMemberPermission(id, memberId, (await request.json()).canEdit))
  )
    error(404, 'Household member not found')
  return new Response(null, { status: 204 })
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const { id } = requireUser(locals)
  if (!(await removeMember(id, Number(params.userId))))
    error(404, 'Household member not found')
  return new Response(null, { status: 204 })
}
