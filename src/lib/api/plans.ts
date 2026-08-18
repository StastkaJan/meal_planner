import type { Plan } from '$lib/database/schema'
import type { PlanDetail } from '$lib/types'
import { jsonBody, request, requestJson } from './http'
import type { ShoppingListItem } from '$lib/domain/shopping'

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

export const saveShoppingItem = (
  planId: number,
  week: string,
  item: ShoppingListItem,
) =>
  request(`/plans/${planId}/shopping/items`, {
    method: 'PATCH',
    body: jsonBody({ week, ...item }),
  })

export const addShoppingItem = (
  planId: number,
  week: string,
  name: string,
  aisle: string,
) =>
  requestJson<ShoppingListItem>(`/plans/${planId}/shopping/items`, {
    method: 'POST',
    body: jsonBody({ week, name, aisle }),
  })

export const deleteShoppingItem = (planId: number, week: string, key: string) =>
  request(
    `/plans/${planId}/shopping/items/${encodeURIComponent(key)}?week=${week}`,
    { method: 'DELETE' },
  )
