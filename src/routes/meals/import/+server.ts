import { json, error } from '@sveltejs/kit'
import {
  findRecipeNode,
  parseRecipeHtml,
  parseRecipeJsonLd,
} from '$lib/server/services/recipe-import'
import {
  fetchPublicHtml,
  SafeFetchError,
} from '$lib/server/services/safe-fetch'
import type { ImportedRecipe } from '$lib/types'
import type { RequestHandler } from './$types'
import { monitorService } from '$lib/server/observability'

export const POST: RequestHandler = ({ request, locals }) =>
  monitorService('recipes', 'import', async () => {
    if (!locals.user) error(401, 'Not authenticated')
    const { url, text } = await request.json()

    let recipe: ImportedRecipe | null = null
    if (typeof text === 'string' && text.trim()) {
      try {
        const node = findRecipeNode([JSON.parse(text)])
        recipe = node ? parseRecipeJsonLd(node) : null
      } catch {
        recipe = parseRecipeHtml(text)
      }
    } else if (typeof url === 'string' && url) {
      try {
        recipe = parseRecipeHtml(await fetchPublicHtml(url))
      } catch (cause) {
        if (cause instanceof SafeFetchError) error(cause.status, cause.message)
        error(502, 'Could not fetch that URL')
      }
    } else {
      error(400, 'Provide a url or text')
    }

    if (!recipe) error(422, "Couldn't find recipe data on that page")
    return json(recipe)
  })
