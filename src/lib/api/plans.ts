import type { Plan } from '$lib/schema'
import type { PlanDetail } from '$lib/types'
import { jsonBody, request, requestJson } from './http'

export const getPlan = (id: number, week: string) =>
  requestJson<PlanDetail>(`/plans/${id}?week=${week}`)

export const createPlan = (name: string) =>
  requestJson<Plan>('/plans', { method: 'POST', body: jsonBody({ name }) })

export const deletePlan = (id: number) =>
  request(`/plans/${id}`, { method: 'DELETE' })

export const updatePlan = (id: number, patch: object) =>
  requestJson<Partial<Plan>>(`/plans/${id}`, {
    method: 'PATCH',
    body: jsonBody(patch),
  })

export const setSlot = (
  planId: number,
  date: string,
  mealType: string,
  mealId: number | null,
) =>
  request(`/plans/${planId}/slots`, {
    method: 'PUT',
    body: jsonBody({ date, mealType, mealId }),
  })

export const populatePlan = (
  planId: number,
  week: string,
  favoritesOnly: boolean,
) =>
  requestJson<{ filled: number }>(`/plans/${planId}/autocompose`, {
    method: 'POST',
    body: jsonBody({ week, favoritesOnly }),
  })

export const copyWeek = (planId: number, from: string, to: string) =>
  request(`/plans/${planId}/copy-week`, {
    method: 'POST',
    body: jsonBody({ from, to }),
  })

export const addBonus = (planId: number, value: object) =>
  request(`/plans/${planId}/bonus`, {
    method: 'POST',
    body: jsonBody(value),
  })

export const deleteBonus = (planId: number, bonusId: number) =>
  request(`/plans/${planId}/bonus/${bonusId}`, { method: 'DELETE' })

export const recalculateDay = (planId: number, date: string) =>
  request(`/plans/${planId}/recalc-day`, {
    method: 'POST',
    body: jsonBody({ date }),
  })

export const setSlotRepeat = (
  planId: number,
  mealType: string,
  groupBreaks: boolean[],
) =>
  request(`/plans/${planId}/slot-repeats`, {
    method: 'PUT',
    body: jsonBody({ mealType, groupBreaks }),
  })
