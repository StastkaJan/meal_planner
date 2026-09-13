import { error, json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import { saveCatalogueIngredient } from '$lib/server/services/ingredients'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = async ({ locals, request, params }) => {
  requireAdmin(locals)
  const id = Number(params.id)
  if (
    !/^[1-9]\d*$/.test(params.id) ||
    !Number.isSafeInteger(id) ||
    id > 2147483647
  )
    error(400, 'Invalid ingredient id')
  return json(
    await saveCatalogueIngredient(await request.json().catch(() => null), id),
  )
}
