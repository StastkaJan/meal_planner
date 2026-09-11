import { json } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { addIngredient } from '$lib/server/services/ingredients'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = requireUser(locals)
  const body = await request.json().catch(() => null)
  return json(await addIngredient(user.id, body), { status: 201 })
}
