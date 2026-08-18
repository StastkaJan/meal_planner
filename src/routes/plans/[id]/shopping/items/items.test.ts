import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireOwnedPlan = vi.hoisted(() => vi.fn())
const mockSaveShoppingItem = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/guards', () => ({
  requireOwnedPlan: mockRequireOwnedPlan,
}))
vi.mock('$lib/server/repositories/plans', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveShoppingItem: mockSaveShoppingItem,
}))

import { PATCH, POST } from './+server'

function event(body: object) {
  return {
    params: { id: '1' },
    request: { json: () => Promise.resolve(body) },
    locals: { user: { id: 1 } },
  } as any
}

describe('/plans/:id/shopping/items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireOwnedPlan.mockResolvedValue({ id: 1 })
  })

  it('creates a trimmed custom item', async () => {
    mockSaveShoppingItem.mockImplementation((_planId, week, item) => ({
      planId: 1,
      week,
      ...item,
    }))

    const response = await POST(
      event({ week: '2026-06-29', name: '  Bin bags ', aisle: 'Other' }),
    )

    expect(response.status).toBe(201)
    expect(mockSaveShoppingItem).toHaveBeenCalledWith(
      1,
      '2026-06-29',
      expect.objectContaining({ name: 'Bin bags', custom: true }),
    )
  })

  it('persists checked, excluded, and aisle state', async () => {
    const response = await PATCH(
      event({
        week: '2026-06-29',
        key: 'ingredient:["Honey","tbsp"]',
        name: 'Honey',
        unit: 'tbsp',
        aisle: 'Pantry',
        checked: true,
        excluded: false,
        custom: false,
      }),
    )

    expect(response.status).toBe(204)
    expect(mockSaveShoppingItem).toHaveBeenCalledWith(
      1,
      '2026-06-29',
      expect.objectContaining({ aisle: 'Pantry', checked: true }),
    )
  })

  it('rejects invalid weeks and aisles', async () => {
    await expect(
      POST(event({ week: 'invalid', name: 'Bin bags', aisle: 'Other' })),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      POST(event({ week: '2026-06-29', name: 'Bin bags', aisle: 'Back room' })),
    ).rejects.toMatchObject({ status: 400 })
  })
})
