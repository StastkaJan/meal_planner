import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { listIngredientOptions } from '$lib/server/repositories/ingredients'
import { load as loadMeal } from '../+page.server'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
  const user = requireUser(event.locals)
  const data = await loadMeal(event)
  if (!data.editable) error(404, 'Meal not found')
  return { ...data, ingredientOptions: await listIngredientOptions(user.id) }
}) satisfies PageServerLoad
