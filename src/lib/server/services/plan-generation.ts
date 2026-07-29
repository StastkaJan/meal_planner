import { resolveTargets } from '$lib/constants'
import { autocomposeSlots, getUserSettings, recalcDaySlots } from '../plans'
import type { Plan } from '$lib/schema'
import { ownedPlan } from '../repositories/plans'

export type PlanPopulationCommand = {
  type: 'populate-plan'
  planId: number
  userId: number
  week: string
  favoritesOnly: boolean
}

// Serializable input and idempotent slot inserts keep this callable from a worker later.
// It runs inline until plan generation is slow enough to justify queue infrastructure.
export async function executePlanPopulation(
  command: PlanPopulationCommand,
  loadedPlan?: Plan & { userId: number },
) {
  const plan = loadedPlan ?? (await ownedPlan(command.planId, command.userId))
  const targets = resolveTargets(await getUserSettings(command.userId))
  return autocomposeSlots(
    plan,
    command.week,
    targets,
    command.userId,
    command.favoritesOnly,
  )
}

export async function recalculatePlanDay(
  plan: Plan & { userId: number },
  userId: number,
  date: string,
) {
  return recalcDaySlots(
    plan,
    date,
    resolveTargets(await getUserSettings(userId)),
    userId,
  )
}
