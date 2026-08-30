import { jsonBody, request, requestJson } from './http'

export const updateProfile = (patch: object) =>
  requestJson('/profile', { method: 'PATCH', body: jsonBody(patch) })

export async function changePassword(current: unknown, next: unknown) {
  const response = await request('/profile', {
    method: 'POST',
    body: jsonBody({ current, next }),
  })
  return response.json() as Promise<{ error?: string; success?: boolean }>
}

export async function deleteAccount(password: unknown, confirmation: unknown) {
  const response = await request('/profile', {
    method: 'DELETE',
    body: jsonBody({ password, confirmation }),
  })
  return response.json() as Promise<{ error?: string; success?: boolean }>
}
