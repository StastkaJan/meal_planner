import { error, json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import { reviewRecipeImport } from '$lib/server/repositories/recipe-imports'
import type { RequestHandler } from './$types'

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  requireAdmin(locals)
  const { status } = await request.json()
  if (!['approved', 'rejected'].includes(status))
    error(400, 'Status must be approved or rejected')
  const reviewed = await reviewRecipeImport(Number(params.id), status)
  if (!reviewed) error(404, 'Pending import not found')
  return json(reviewed)
}
