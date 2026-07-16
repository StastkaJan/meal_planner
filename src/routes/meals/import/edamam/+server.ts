import { json, error } from '@sveltejs/kit'
import { parseEdamamRecipe } from '$lib/server/meals'
import type { RequestHandler } from './$types'

const FETCH_TIMEOUT_MS = 8000

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated')
  const { query } = await request.json()
  if (typeof query !== 'string' || !query.trim()) error(400, 'Provide a query')

  const appId = process.env.EDAMAM_APP_ID
  const appKey = process.env.EDAMAM_APP_KEY
  if (!appId || !appKey) error(500, 'Edamam is not configured')

  const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(query.trim())}&app_id=${appId}&app_key=${appKey}`

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch {
    error(502, 'Could not reach Edamam')
  }
  if (!res.ok) error(502, 'Could not reach Edamam')

  const data = await res.json()
  const hit = data?.hits?.[0]?.recipe
  if (!hit) error(422, 'No recipes found for that search')

  return json(parseEdamamRecipe(hit))
}
