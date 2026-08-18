import { jsonBody, request, requestJson } from './http'

export const createHousehold = (name: string) =>
  requestJson('/household', { method: 'POST', body: jsonBody({ name }) })

export const addMember = (email: string, canEdit: boolean) =>
  request('/household', {
    method: 'PUT',
    body: jsonBody({ email, canEdit }),
  })

export const updateMember = (userId: number, canEdit: boolean) =>
  request(`/household/members/${userId}`, {
    method: 'PATCH',
    body: jsonBody({ canEdit }),
  })

export const removeMember = (userId: number) =>
  request(`/household/members/${userId}`, { method: 'DELETE' })
