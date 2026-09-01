import { jsonBody, requestJson } from './http'

export type ManagedUser = {
  id: number
  email: string
  isAdmin: boolean
  isPro: boolean
}

export const setUserAdmin = (id: number, isAdmin: boolean) =>
  requestJson<ManagedUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: jsonBody({ isAdmin }),
  })

export const setUserPro = (id: number, isPro: boolean) =>
  requestJson<ManagedUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: jsonBody({ isPro }),
  })
