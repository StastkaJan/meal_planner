import type { IngredientOption } from '$lib/domain/ingredients'
import { jsonBody, requestJson } from './http'

export const createIngredient = (name: string) =>
  requestJson<IngredientOption>('/ingredients', {
    method: 'POST',
    body: jsonBody({ name }),
  })
