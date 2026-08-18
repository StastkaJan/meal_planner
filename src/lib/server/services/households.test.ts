import { beforeEach, describe, expect, it, vi } from 'vitest'

const repo = vi.hoisted(() => ({
  addHouseholdMember: vi.fn(),
  createHousehold: vi.fn(),
  getHouseholdDetail: vi.fn(),
  removeHouseholdMember: vi.fn(),
  updateHouseholdMember: vi.fn(),
}))
vi.mock('../repositories/households', () => repo)

import {
  createUserHousehold,
  inviteExistingMember,
  setMemberPermission,
} from './households'

describe('household service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates one named household per user', async () => {
    repo.getHouseholdDetail.mockResolvedValue(null)
    repo.createHousehold.mockResolvedValue({ id: 1, name: 'Home' })
    await expect(createUserHousehold(7, ' Home ')).resolves.toEqual({
      household: { id: 1, name: 'Home' },
    })
    expect(repo.createHousehold).toHaveBeenCalledWith(7, 'Home')
  })

  it('rejects invalid or duplicate household creation', async () => {
    repo.getHouseholdDetail.mockResolvedValue({ id: 1 })
    await expect(createUserHousehold(7, 'Home')).resolves.toEqual({
      error: 'already_member',
    })
    repo.getHouseholdDetail.mockResolvedValue(null)
    await expect(createUserHousehold(7, ' ')).resolves.toEqual({
      error: 'invalid_name',
    })
  })

  it('normalizes member email and requires an explicit boolean permission', async () => {
    repo.addHouseholdMember.mockResolvedValue('added')
    await expect(
      inviteExistingMember(7, ' MEMBER@EXAMPLE.COM ', false),
    ).resolves.toBe('added')
    expect(repo.addHouseholdMember).toHaveBeenCalledWith(
      7,
      'member@example.com',
      false,
    )
    await expect(
      inviteExistingMember(7, 'member@example.com', 'yes'),
    ).resolves.toBe('invalid')
  })

  it('rejects malformed permission updates', async () => {
    await expect(setMemberPermission(7, 8, 'yes')).resolves.toBe(false)
    expect(repo.updateHouseholdMember).not.toHaveBeenCalled()
  })
})
