import { error, json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import { importCatalogueBatch } from '$lib/server/services/catalogue-imports'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = requireAdmin(locals)
  const result = await importCatalogueBatch(user.id, await request.json())
  if ('batchError' in result) error(400, result.batchError)
  return json(result, { status: 201 })
}
