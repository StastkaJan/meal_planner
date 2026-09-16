import { jsonBody, requestOk } from './http'

export const requestPasswordReset = (email: string) =>
  requestOk('/auth/forgot-password', {
    method: 'POST',
    body: jsonBody({ email }),
  })

export const resetPassword = (token: string, password: string) =>
  requestOk('/auth/reset-password', {
    method: 'POST',
    body: jsonBody({ token, password }),
  })
