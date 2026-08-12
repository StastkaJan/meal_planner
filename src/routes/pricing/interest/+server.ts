import { error } from '@sveltejs/kit'
import { requireUser } from '$lib/server/guards'
import { log } from '$lib/server/observability'
import {
  savePricingInterest,
  type BillingInterval,
} from '$lib/server/repositories/pricing-interests'
import type { RequestHandler } from './$types'

const intervals = new Set<BillingInterval>(['monthly', 'annual'])

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals)
  const body = await request.json().catch(() => error(400, 'Invalid JSON'))
  const billingInterval = body?.billingInterval

  if (!intervals.has(billingInterval)) error(400, 'Invalid billing interval')

  await savePricingInterest(user.id, billingInterval)
  log('info', 'pricing_interest', { userId: user.id, billingInterval })
  return new Response(null, { status: 204 })
}
