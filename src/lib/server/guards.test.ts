import { beforeEach, describe, expect, it, vi } from 'vitest'

const accessiblePlan = vi.hoisted(() => vi.fn())
const findAllowedMeal = vi.hoisted(() => vi.fn())
const findEditableMeal = vi.hoisted(() => vi.fn())
vi.mock('./repositories/plans', () => ({ accessiblePlan }))
vi.mock('./repositories/meals', () => ({ findAllowedMeal, findEditableMeal }))

import { requireOwnedPlan, requireVisiblePlan } from './guards'

const locals = {
  user: { id: 7, email: 'member@example.com', isAdmin: false, locale: null },
  locale: 'en' as const,
}

describe('shared plan guards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows a household member to view a shared plan without edit access', async () => {
    accessiblePlan.mockResolvedValue({ id: 4, canEdit: false })
    await expect(requireVisiblePlan(locals, 4)).resolves.toMatchObject({
      id: 4,
    })
    expect(accessiblePlan).toHaveBeenCalledWith(4, 7)
  })

  it('requires explicit edit permission for plan mutations', async () => {
    accessiblePlan.mockResolvedValue(null)
    await expect(requireOwnedPlan(locals, 4)).rejects.toMatchObject({
      status: 404,
    })
    expect(accessiblePlan).toHaveBeenCalledWith(4, 7, true)
  })
})
