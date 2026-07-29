import { json } from '@sveltejs/kit'
import { MAX_PASSWORD } from '$lib/auth'
import { requireUser } from '$lib/server/guards'
import {
  changePassword,
  updateProfileSettings,
} from '$lib/server/services/profile'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const { id } = requireUser(locals)
  return json(await updateProfileSettings(id, await request.json()))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { id } = requireUser(locals)
  const { current, next } = await request.json()

  if (typeof next !== 'string' || next.length < 8)
    return json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 },
    )
  if (typeof next === 'string' && next.length > MAX_PASSWORD)
    return json(
      { error: 'New password must be at most 128 characters' },
      { status: 400 },
    )

  if (!(await changePassword(id, current, next)))
    return json({ error: 'Current password is incorrect' }, { status: 400 })
  return json({ success: true })
}
