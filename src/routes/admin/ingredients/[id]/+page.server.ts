import { error } from '@sveltejs/kit'
import { requireAdmin } from '$lib/server/guards'
import { getManagedIngredient } from '$lib/server/repositories/ingredients'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, params }) => {
  requireAdmin(locals)
  if (params.id === 'new') return { ingredient: null }
  const id = Number(params.id)
  if (
    !/^[1-9]\d*$/.test(params.id) ||
    !Number.isSafeInteger(id) ||
    id > 2147483647
  )
    error(404, 'Ingredient not found')
  const ingredient = await getManagedIngredient(id)
  if (!ingredient) error(404, 'Ingredient not found')
  return { ingredient }
}
