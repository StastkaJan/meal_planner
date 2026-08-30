import type { Plan } from '$lib/database/schema'
import type { PlanDetail } from '$lib/types'
import { jsonBody, request, requestJson } from './http'

export const getPlan = (id: number, week: string) =>
  requestJson<PlanDetail>(`/plans/${id}?week=${week}`)

export const createPlan = () => requestJson<Plan>('/plans', { method: 'POST' })

export const deletePlan = (id: number) =>
  request(`/plans/${id}`, { method: 'DELETE' })

export const setPlanPortions = (id: number, portions: number) =>
  requestJson<Plan>(`/plans/${id}`, {
    method: 'PATCH',
    body: jsonBody({ portions }),
  })

export const setPlanMealSlots = (id: number, mealSlots: string[]) =>
  requestJson<Plan>(`/plans/${id}`, {
    method: 'PATCH',
    body: jsonBody({ mealSlots }),
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

export const setSlotLeftover = (
  planId: number,
  date: string,
  mealType: string,
  source: { date: string; mealType: string } | null,
) =>
  request(`/plans/${planId}/slots`, {
    method: 'PATCH',
    body: jsonBody({ date, mealType, source }),
  })

export const populatePlan = (
  planId: number,
  week: string,
  favoritesOnly: boolean,
  myRecipesOnly: boolean,
) =>
  requestJson<{ filled: number }>(`/plans/${planId}/autocompose`, {
    method: 'POST',
    body: jsonBody({ week, favoritesOnly, myRecipesOnly }),
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
