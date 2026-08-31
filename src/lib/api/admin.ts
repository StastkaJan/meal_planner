import { jsonBody, requestJson } from './http'

export type ManagedUser = {
  id: number
  email: string
  isAdmin: boolean
}

export const setUserAdmin = (id: number, isAdmin: boolean) =>
  requestJson<ManagedUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: jsonBody({ isAdmin }),
  })
