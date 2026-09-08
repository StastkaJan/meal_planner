import { error, json } from '@sveltejs/kit'
import { z } from 'zod'
import { requireOwnedPlan, requirePro } from '$lib/server/guards'
import { validDateStr } from '$lib/server/services/date'
import { rerollPlanMeal } from '$lib/server/services/plan-generation'
import type { RequestHandler } from './$types'

const input = z.object({
  date: z.string(),
  mealType: z.string(),
  favoritesOnly: z.boolean().default(false),
  myRecipesOnly: z.boolean().default(false),
})

export const POST: RequestHandler = async ({ params, locals, request }) => {
  requirePro(locals)
  const plan = await requireOwnedPlan(locals, params.id)
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) error(400, 'Invalid request')
  const { date, mealType, ...filters } = parsed.data
  validDateStr(date)
  if (!plan.mealSlots.includes(mealType)) error(400, 'Invalid mealType')
  return json(await rerollPlanMeal(plan, date, mealType, filters))
}
