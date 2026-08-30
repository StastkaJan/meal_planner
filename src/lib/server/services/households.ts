import {
  acceptHouseholdInvitation,
  createHousehold,
  createHouseholdInvitation,
  declineHouseholdInvitation,
  getHouseholdDetail,
  leaveHousehold as leaveHouseholdRepository,
  removeHouseholdMember,
  updateHouseholdMember,
} from '../repositories/households'

export async function createUserHousehold(userId: number, name: unknown) {
  if (await getHouseholdDetail(userId))
    return { error: 'already_member' as const }
  const normalized = typeof name === 'string' ? name.trim() : ''
  if (!normalized || normalized.length > 80)
    return { error: 'invalid_name' as const }
  return { household: await createHousehold(userId, normalized) }
}

export async function inviteExistingMember(
  userId: number,
  email: unknown,
  canEdit: unknown,
) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalized || typeof canEdit !== 'boolean') return 'invalid' as const
  return createHouseholdInvitation(userId, normalized, canEdit)
}

export async function acceptInvitation(userId: number, householdId: number) {
  if (!Number.isSafeInteger(householdId)) return 'not_found' as const
  return acceptHouseholdInvitation(userId, householdId)
}

export async function declineInvitation(userId: number, householdId: number) {
  if (!Number.isSafeInteger(householdId)) return false
  return declineHouseholdInvitation(userId, householdId)
}

export async function leaveHousehold(userId: number) {
  return leaveHouseholdRepository(userId)
}

export async function setMemberPermission(
  userId: number,
  memberId: number,
  canEdit: unknown,
) {
  if (!Number.isSafeInteger(memberId) || typeof canEdit !== 'boolean')
    return false
  return updateHouseholdMember(userId, memberId, canEdit)
}

export async function removeMember(userId: number, memberId: number) {
  if (!Number.isSafeInteger(memberId)) return false
  return removeHouseholdMember(userId, memberId)
}
