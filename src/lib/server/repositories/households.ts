import { and, eq } from 'drizzle-orm'
import { db } from '$lib/database'
import {
  householdInvitations,
  householdMembers,
  households,
  users,
} from '$lib/database/schema'

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

export async function getHouseholdInvitations(userId: number) {
  return db
    .select({
      householdId: householdInvitations.householdId,
      householdName: households.name,
      canEdit: householdInvitations.canEdit,
    })
    .from(householdInvitations)
    .innerJoin(households, eq(households.id, householdInvitations.householdId))
    .where(eq(householdInvitations.userId, userId))
    .orderBy(households.name)
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
    await tx
      .delete(householdInvitations)
      .where(eq(householdInvitations.userId, userId))
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

export async function createHouseholdInvitation(
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
    .insert(householdInvitations)
    .values({ householdId: household.id, userId: user.id, canEdit })
    .onConflictDoUpdate({
      target: [householdInvitations.householdId, householdInvitations.userId],
      set: { canEdit },
    })
  return 'invited' as const
}

export async function acceptHouseholdInvitation(
  userId: number,
  householdId: number,
) {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select({ canEdit: householdInvitations.canEdit })
      .from(householdInvitations)
      .where(
        and(
          eq(householdInvitations.householdId, householdId),
          eq(householdInvitations.userId, userId),
        ),
      )
      .limit(1)
    if (!invitation) return 'not_found' as const

    const [member] = await tx
      .insert(householdMembers)
      .values({ householdId, userId, canEdit: invitation.canEdit })
      .onConflictDoNothing({ target: householdMembers.userId })
      .returning({ userId: householdMembers.userId })
    if (!member) return 'already_member' as const

    await tx
      .delete(householdInvitations)
      .where(eq(householdInvitations.userId, userId))
    return 'accepted' as const
  })
}

export async function declineHouseholdInvitation(
  userId: number,
  householdId: number,
) {
  const [invitation] = await db
    .delete(householdInvitations)
    .where(
      and(
        eq(householdInvitations.householdId, householdId),
        eq(householdInvitations.userId, userId),
      ),
    )
    .returning({ userId: householdInvitations.userId })
  return Boolean(invitation)
}

export async function leaveHousehold(userId: number) {
  const access = await getHouseholdAccess(userId)
  if (!access || access.ownerId === userId) return false
  const [member] = await db
    .delete(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .returning({ userId: householdMembers.userId })
  return Boolean(member)
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
