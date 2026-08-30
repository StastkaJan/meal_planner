import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import {
  acceptInvitation,
  declineInvitation,
} from '$lib/server/services/households'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, params }) => {
  const { id } = requireUser(locals)
  const result = await acceptInvitation(id, Number(params.householdId))
  if (result === 'not_found') error(404, 'Household invitation not found')
  if (result === 'already_member')
    error(409, 'User already belongs to a household')
  return new Response(null, { status: 204 })
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const { id } = requireUser(locals)
  if (!(await declineInvitation(id, Number(params.householdId))))
    error(404, 'Household invitation not found')
  return new Response(null, { status: 204 })
}
