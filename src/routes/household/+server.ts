import { error, json } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { getHouseholdDetail } from '$lib/server/repositories/households'
import {
  createUserHousehold,
  inviteExistingMember,
  leaveHousehold,
} from '$lib/server/services/households'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  const { id } = requireUser(locals)
  return json(await getHouseholdDetail(id))
}

export const POST: RequestHandler = async ({ locals, request }) => {
  const { id } = requireUser(locals)
  const result = await createUserHousehold(id, (await request.json()).name)
  if ('error' in result)
    error(
      result.error === 'already_member' ? 409 : 400,
      'Unable to create household',
    )
  return json(result.household, { status: 201 })
}

export const PUT: RequestHandler = async ({ locals, request }) => {
  const { id } = requireUser(locals)
  const { email, canEdit } = await request.json()
  const result = await inviteExistingMember(id, email, canEdit)
  if (result === 'invalid') error(400, 'Email and permission are required')
  if (result === 'not_owner')
    error(403, 'Only the household owner can add members')
  if (result === 'not_found') error(404, 'No registered user has that email')
  if (result === 'already_member')
    error(409, 'User already belongs to a household')
  return new Response(null, { status: 204 })
}

export const DELETE: RequestHandler = async ({ locals }) => {
  const { id } = requireUser(locals)
  if (!(await leaveHousehold(id)))
    error(409, 'Household owners cannot leave their household')
  return new Response(null, { status: 204 })
}
