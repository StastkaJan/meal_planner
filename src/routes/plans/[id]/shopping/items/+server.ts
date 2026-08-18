import { randomUUID } from 'node:crypto'
import { error, json } from '@sveltejs/kit'
import { AISLES } from '$lib/domain/shopping'
import { requireOwnedPlan } from '$lib/server/guards'
import { saveShoppingItem } from '$lib/server/repositories/plans'
import { validDateStr } from '$lib/server/services/date'
import type { RequestHandler } from './$types'

function validAisle(value: unknown) {
  if (
    typeof value !== 'string' ||
    !(AISLES as readonly string[]).includes(value)
  )
    error(400, 'Invalid aisle')
  return value
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { week, name, aisle } = await request.json().catch(() => ({}))
  validDateStr(week)
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100)
    error(400, 'Name is required and must be at most 100 characters')

  const item = await saveShoppingItem(plan.id, week, {
    key: `custom:${randomUUID()}`,
    name: name.trim(),
    unit: null,
    aisle: validAisle(aisle),
    checked: false,
    excluded: false,
    custom: true,
  })
  return json({ ...item, qty: null, count: 1 }, { status: 201 })
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const plan = await requireOwnedPlan(locals, params.id)
  const { week, key, name, unit, aisle, checked, excluded, custom } =
    await request.json().catch(() => ({}))
  validDateStr(week)
  if (
    typeof key !== 'string' ||
    !key ||
    key.length > 250 ||
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 100 ||
    (unit !== null && typeof unit !== 'string') ||
    typeof checked !== 'boolean' ||
    typeof excluded !== 'boolean' ||
    typeof custom !== 'boolean'
  )
    error(400, 'Invalid shopping item')

  await saveShoppingItem(plan.id, week, {
    key,
    name: name.trim(),
    unit,
    aisle: validAisle(aisle),
    checked,
    excluded,
    custom,
  })
  return new Response(null, { status: 204 })
}
