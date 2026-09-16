import type { IngredientOption } from '$lib/domain/ingredients'
import type { IngredientAdminInput } from '$lib/domain/ingredient-admin'
import { jsonBody, requestJson } from './http'

export const mergeCatalogueIngredients = (sourceId: number, targetId: number) =>
  requestJson<IngredientOption>('/admin/ingredients/merge', {
    method: 'POST',
    body: jsonBody({ sourceId, targetId }),
  })

export const createIngredient = (name: string) =>
  requestJson<IngredientOption>('/ingredients', {
    method: 'POST',
    body: jsonBody({ name }),
  })

export const saveCatalogueIngredient = (
  body: IngredientAdminInput,
  id?: number,
) =>
  requestJson<IngredientOption>(
    id === undefined ? '/admin/ingredients' : `/admin/ingredients/${id}`,
    {
      method: id === undefined ? 'POST' : 'PUT',
      body: jsonBody(body),
    },
  )
