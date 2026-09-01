import { error, json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import {
  updateUserAdmin,
  updateUserPro,
} from '$lib/server/repositories/accounts'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  const admin = requireAdmin(locals)
  const id = Number(params.id)
  const body = await request.json().catch(() => null)
  if (
    !/^[1-9]\d*$/.test(params.id) ||
    !Number.isSafeInteger(id) ||
    id > 2_147_483_647
  )
    error(400, 'Invalid user id')
  if (!body || typeof body !== 'object' || Array.isArray(body))
    error(400, 'Invalid JSON')
  const { isAdmin, isPro } = body as Record<string, unknown>
  if ((typeof isAdmin === 'boolean') === (typeof isPro === 'boolean'))
    error(400, 'Provide either isAdmin or isPro as a boolean')
  if (typeof isAdmin === 'boolean' && id === admin.id)
    error(400, 'You cannot change your own admin access')
  const user =
    typeof isAdmin === 'boolean'
      ? await updateUserAdmin(admin.id, id, isAdmin)
      : await updateUserPro(admin.id, id, isPro as boolean)
  if (user === false) error(403, 'Admin access changed; refresh and try again')
  if (!user) error(404, 'User not found')
  return json(user)
}
