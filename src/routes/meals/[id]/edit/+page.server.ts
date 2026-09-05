import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { load as loadMeal } from '../+page.server'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
  requireUser(event.locals)
  const data = await loadMeal(event)
  if (!data.editable) error(404, 'Meal not found')
  return data
}) satisfies PageServerLoad
