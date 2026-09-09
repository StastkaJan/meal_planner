import type { SavedExtra } from '$lib/database/schema'
import type { ExtraFields } from '$lib/domain/extras'
import { jsonBody, requestJson, requestOk } from './http'

export const saveExtra = (fields: ExtraFields) =>
  requestJson<SavedExtra>('/extras', { method: 'POST', body: jsonBody(fields) })
export const deleteSavedExtra = (id: number) =>
  requestOk(`/extras/${id}`, { method: 'DELETE' })
