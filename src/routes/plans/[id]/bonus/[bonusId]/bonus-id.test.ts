import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockDeleteBonusItem = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/plans', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
  deleteBonusItem: mockDeleteBonusItem,
}))

import { DELETE } from './+server'

function makeEvent(bonusId = '9', planId = '1', userId = 1) {
  return {
    params: { id: planId, bonusId },
    locals: { user: { id: userId } },
  } as any
}

describe('DELETE /plans/:id/bonus/:bonusId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when plan is not owned by the user', async () => {
    mockRequireOwnedPlan.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )
    await expect(DELETE(makeEvent())).rejects.toMatchObject({ status: 404 })
  })

  it('deletes the bonus item scoped to the plan and returns 204', async () => {
    mockRequireOwnedPlan.mockResolvedValueOnce({ id: 1, userId: 1 })
    const res = await DELETE(makeEvent('9'))
    expect(res.status).toBe(204)
    expect(mockDeleteBonusItem).toHaveBeenCalledWith(1, 9)
  })
})
