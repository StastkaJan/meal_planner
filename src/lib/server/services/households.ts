import {
  addHouseholdMember,
  createHousehold,
  getHouseholdDetail,
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
  return addHouseholdMember(userId, normalized, canEdit)
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
