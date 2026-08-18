import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockDeleteCustomShoppingItem = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
}))
vi.mock('$lib/server/repositories/plans', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteCustomShoppingItem: mockDeleteCustomShoppingItem,
}))

import { DELETE } from './+server'

describe('DELETE /plans/:id/shopping/items/:key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireOwnedPlan.mockResolvedValue({ id: 1 })
  })

  it('removes a custom item for the requested week', async () => {
    const response = await DELETE({
      params: { id: '1', key: 'custom:1' },
      locals: { user: { id: 1 } },
      url: new URL('http://localhost?week=2026-06-29'),
    } as any)

    expect(response.status).toBe(204)
    expect(mockDeleteCustomShoppingItem).toHaveBeenCalledWith(
      1,
      '2026-06-29',
      'custom:1',
    )
  })

  it('rejects a missing week', async () => {
    await expect(
      DELETE({
        params: { id: '1', key: 'custom:1' },
        locals: { user: { id: 1 } },
        url: new URL('http://localhost'),
      } as any),
    ).rejects.toMatchObject({ status: 400 })
  })
})
