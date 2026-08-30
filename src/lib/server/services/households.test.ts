import { beforeEach, describe, expect, it, vi } from 'vitest'

const repo = vi.hoisted(() => ({
  acceptHouseholdInvitation: vi.fn(),
  createHousehold: vi.fn(),
  createHouseholdInvitation: vi.fn(),
  declineHouseholdInvitation: vi.fn(),
  getHouseholdDetail: vi.fn(),
  leaveHousehold: vi.fn(),
  removeHouseholdMember: vi.fn(),
  updateHouseholdMember: vi.fn(),
}))
vi.mock('../repositories/households', () => repo)

import {
  acceptInvitation,
  createUserHousehold,
  declineInvitation,
  inviteExistingMember,
  leaveHousehold,
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
    repo.createHouseholdInvitation.mockResolvedValue('invited')
    await expect(
      inviteExistingMember(7, ' MEMBER@EXAMPLE.COM ', false),
    ).resolves.toBe('invited')
    expect(repo.createHouseholdInvitation).toHaveBeenCalledWith(
      7,
      'member@example.com',
      false,
    )
    await expect(
      inviteExistingMember(7, 'member@example.com', 'yes'),
    ).resolves.toBe('invalid')
  })

  it('requires the invited user to accept membership explicitly', async () => {
    repo.acceptHouseholdInvitation.mockResolvedValue('accepted')
    await expect(acceptInvitation(8, 3)).resolves.toBe('accepted')
    expect(repo.acceptHouseholdInvitation).toHaveBeenCalledWith(8, 3)

    repo.declineHouseholdInvitation.mockResolvedValue(true)
    await expect(declineInvitation(8, 3)).resolves.toBe(true)
    expect(repo.declineHouseholdInvitation).toHaveBeenCalledWith(8, 3)
  })

  it('allows non-owner members to leave through the repository guard', async () => {
    repo.leaveHousehold.mockResolvedValue(true)
    await expect(leaveHousehold(8)).resolves.toBe(true)
    expect(repo.leaveHousehold).toHaveBeenCalledWith(8)
  })

  it('rejects malformed permission updates', async () => {
    await expect(setMemberPermission(7, 8, 'yes')).resolves.toBe(false)
    expect(repo.updateHouseholdMember).not.toHaveBeenCalled()
  })
})
