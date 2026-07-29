import { mondayOf } from '$lib/date'
import {
  addBonusItem,
  copyWeek,
  createPlan,
  deleteBonusItem,
  deletePlan,
  getShoppingList,
  listPlans,
  setSlotRepeat,
  updatePlan,
  upsertSlot,
} from '../repositories/plans'
import { getPlanDetail } from '../plans'
import { getSettings } from '../repositories/accounts'

export {
  addBonusItem,
  copyWeek,
  deleteBonusItem,
  getPlanDetail,
  getShoppingList,
  listPlans,
  setSlotRepeat,
  upsertSlot,
}

export async function createUserPlan(userId: number, name: string) {
  const settings = await getSettings(userId)
  return createPlan(userId, {
    name,
    weekStart: mondayOf(new Date().toISOString().slice(0, 10)),
    cuisinePrefs: settings?.cuisinePrefs ?? [],
    dietaryRestrictions: settings?.dietaryRestrictions ?? [],
  })
}

export { deletePlan, updatePlan }
