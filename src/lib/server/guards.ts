import { error } from '@sveltejs/kit'
import { findAllowedMeal, findEditableMeal } from './repositories/meals'
import { accessiblePlan } from './repositories/plans'

export function requireUser(locals: App.Locals) {
  if (!locals.user) error(401, 'Not authenticated')
  return locals.user
}

export function requireAdmin(locals: App.Locals) {
  const user = requireUser(locals)
  if (!user.isAdmin) error(403, 'Admin access required')
  return user
}

export async function requireVisiblePlan(
  locals: App.Locals,
  id: number | string,
) {
  const user = requireUser(locals)
  const plan = await accessiblePlan(Number(id), user.id)
  if (!plan) error(404, 'Plan not found')
  return plan
}

export async function requireEditablePlan(
  locals: App.Locals,
  id: number | string,
) {
  const user = requireUser(locals)
  const plan = await accessiblePlan(Number(id), user.id, true)
  if (!plan) error(404, 'Plan not found')
  return plan
}

// Kept as the mutation guard name used by existing plan routes.
export const requireOwnedPlan = requireEditablePlan

export async function requireEditableMeal(
  locals: App.Locals,
  id: number | string,
) {
  const user = requireUser(locals)
  if (!(await findEditableMeal(Number(id), user.id, user.isAdmin)))
    error(404, 'Meal not found')
  return { user }
}

export async function requireVisibleMeal(
  locals: App.Locals,
  id: number | string,
) {
  const user = requireUser(locals)
  if (!(await findAllowedMeal(Number(id), user.id)))
    error(404, 'Meal not found')
  return { user }
}
