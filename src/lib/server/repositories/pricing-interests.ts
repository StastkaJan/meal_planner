import { db } from '$lib/database'
import { pricingInterests } from '$lib/database/schema'

export type BillingInterval = 'monthly' | 'annual'

export async function savePricingInterest(
  userId: number,
  billingInterval: BillingInterval,
) {
  await db
    .insert(pricingInterests)
    .values({ userId, billingInterval })
    .onConflictDoUpdate({
      target: pricingInterests.userId,
      set: { billingInterval, updatedAt: new Date() },
    })
}
