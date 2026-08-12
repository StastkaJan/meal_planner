import { jsonBody, requestJson } from './http'

export const queueCatalogue = (recipes: unknown[]) =>
  requestJson<{ accepted: number; duplicates: number; errors: unknown[] }>(
    '/admin/recipes',
    { method: 'POST', body: jsonBody(recipes) },
  )

export const reviewCatalogueRecipe = (
  id: number,
  status: 'approved' | 'rejected',
) =>
  requestJson(`/admin/recipes/${id}`, {
    method: 'PATCH',
    body: jsonBody({ status }),
  })
