import { json } from '@sveltejs/kit'
import { MAX_PASSWORD } from '$lib/server/services/auth'
import { requireUser } from '$lib/server/guards'
import {
  changePassword,
  deleteAccount,
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

export const DELETE: RequestHandler = async ({ request, locals, cookies }) => {
  const { id } = requireUser(locals)
  const { password, confirmation } = await request.json()
  if (
    typeof password !== 'string' ||
    !password ||
    password.length > MAX_PASSWORD ||
    typeof confirmation !== 'string'
  )
    return json(
      { error: 'Password and confirmation are required' },
      { status: 400 },
    )

  if (!(await deleteAccount(id, password, confirmation)))
    return json(
      { error: 'Password or confirmation is incorrect' },
      { status: 400 },
    )

  cookies.delete('session', { path: '/' })
  return json({ success: true })
}
