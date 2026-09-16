import { json } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import { mergeCatalogueIngredients } from '$lib/server/services/ingredients'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals, request }) => {
  requireAdmin(locals)
  return json(
    await mergeCatalogueIngredients(await request.json().catch(() => null)),
  )
}
