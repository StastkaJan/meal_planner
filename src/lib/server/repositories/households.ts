import { and, eq } from 'drizzle-orm'
import { db } from '$lib/database'
import { householdMembers, households, users } from '$lib/database/schema'

export async function getHouseholdAccess(userId: number) {
  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      canEdit: householdMembers.canEdit,
      ownerId: households.ownerId,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId))
    .limit(1)
  if (!membership) return null

  const peers = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, membership.householdId))
  return { ...membership, userIds: peers.map((peer) => peer.userId) }
}

export async function getHouseholdDetail(userId: number) {
  const access = await getHouseholdAccess(userId)
  if (!access) return null
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, access.householdId))
    .limit(1)
  const members = await db
    .select({
      userId: householdMembers.userId,
      email: users.email,
      canEdit: householdMembers.canEdit,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, access.householdId))
    .orderBy(users.email)
  return { ...household, members, isOwner: access.ownerId === userId }
}

export async function createHousehold(userId: number, name: string) {
  return db.transaction(async (tx) => {
    const [household] = await tx
      .insert(households)
      .values({ name, ownerId: userId })
      .returning()
    await tx
      .insert(householdMembers)
      .values({ householdId: household.id, userId, canEdit: true })
    return household
  })
}

async function ownedHousehold(ownerId: number) {
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.ownerId, ownerId))
    .limit(1)
  return household ?? null
}

export async function addHouseholdMember(
  ownerId: number,
  email: string,
  canEdit: boolean,
) {
  const household = await ownedHousehold(ownerId)
  if (!household) return 'not_owner' as const
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (!user) return 'not_found' as const
  const [existing] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1)
  if (existing) return 'already_member' as const
  await db
    .insert(householdMembers)
    .values({ householdId: household.id, userId: user.id, canEdit })
  return 'added' as const
}

export async function updateHouseholdMember(
  ownerId: number,
  userId: number,
  canEdit: boolean,
) {
  const household = await ownedHousehold(ownerId)
  if (!household || userId === ownerId) return false
  const [member] = await db
    .update(householdMembers)
    .set({ canEdit })
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.userId, userId),
      ),
    )
    .returning({ userId: householdMembers.userId })
  return Boolean(member)
}

export async function removeHouseholdMember(ownerId: number, userId: number) {
  const household = await ownedHousehold(ownerId)
  if (!household || userId === ownerId) return false
  const [member] = await db
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.userId, userId),
      ),
    )
    .returning({ userId: householdMembers.userId })
  return Boolean(member)
}
