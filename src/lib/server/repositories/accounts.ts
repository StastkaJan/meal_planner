import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { users, userSettings } from '$lib/schema'

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return user ?? null
}

export async function findUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

export async function createUser(email: string, passwordHash: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning()
  return user
}

export async function updatePassword(id: number, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

export async function getSettings(userId: number) {
  const [settings] = await db
    .select({
      cuisinePrefs: userSettings.cuisinePrefs,
      dietaryRestrictions: userSettings.dietaryRestrictions,
      calorieTarget: userSettings.calorieTarget,
      proteinTarget: userSettings.proteinTarget,
      carbsTarget: userSettings.carbsTarget,
      fatTarget: userSettings.fatTarget,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)
  return settings ?? null
}

export async function saveSettings(
  userId: number,
  patch: Record<string, unknown>,
) {
  const [settings] = await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: userSettings.userId, set: patch })
    .returning()
  return settings
}
