import { beforeEach, describe, expect, it, vi } from 'vitest'

const savePricingInterest = vi.hoisted(() => vi.fn())
const log = vi.hoisted(() => vi.fn())
vi.mock('$lib/server/repositories/pricing-interests', () => ({
  savePricingInterest,
}))
vi.mock('$lib/server/observability', () => ({ log }))

import { POST } from './+server'

function event(body: unknown, userId = 7) {
  return {
    request: new Request('http://localhost/pricing/interest', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    locals: { user: { id: userId } },
  } as any
}

describe('POST /pricing/interest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records a valid interest choice', async () => {
    const response = await POST(event({ billingInterval: 'annual' }))

    expect(response.status).toBe(204)
    expect(savePricingInterest).toHaveBeenCalledWith(7, 'annual')
    expect(log).toHaveBeenCalledWith('info', 'pricing_interest', {
      userId: 7,
      billingInterval: 'annual',
    })
  })

  it('requires authentication', async () => {
    await expect(POST({ ...event({}), locals: {} })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('rejects unknown billing intervals', async () => {
    await expect(
      POST(event({ billingInterval: 'weekly' })),
    ).rejects.toMatchObject({ status: 400 })
    expect(savePricingInterest).not.toHaveBeenCalled()
  })
})
