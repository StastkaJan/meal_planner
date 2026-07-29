import { requireUser } from '$lib/auth'
import { assertCanEdit } from './meals'
import { requireOwnedPlan as findOwnedPlan } from './plans'

export { requireUser }

export async function requireOwnedPlan(
  locals: App.Locals,
  id: number | string,
) {
  return findOwnedPlan(locals, id)
}

export async function requireEditableMeal(
  locals: App.Locals,
  id: number | string,
) {
  const user = requireUser(locals)
  await assertCanEdit(Number(id), user.id)
  return { user }
}
