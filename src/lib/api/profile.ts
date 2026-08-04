import { jsonBody, request } from './http'

export const updateProfile = (patch: object) =>
  request('/profile', { method: 'PATCH', body: jsonBody(patch) })

export async function changePassword(current: unknown, next: unknown) {
  const response = await request('/profile', {
    method: 'POST',
    body: jsonBody({ current, next }),
  })
  return response.json() as Promise<{ error?: string; success?: boolean }>
}
