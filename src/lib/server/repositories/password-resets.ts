import { and, eq, gt } from 'drizzle-orm'
import { db } from '$lib/database'
import { passwordResets, sessions, users } from '$lib/database/schema'

export async function savePasswordReset(
  userId: number,
  passwordHash: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update')
    if (!user || user.passwordHash !== passwordHash) return false
    await tx
      .insert(passwordResets)
      .values({ userId, passwordHash, tokenHash, expiresAt })
      .onConflictDoUpdate({
        target: passwordResets.userId,
        set: { passwordHash, tokenHash, expiresAt },
      })
    return true
  })
}

export async function consumePasswordReset(
  tokenHash: string,
  nextPasswordHash: string,
) {
  return db.transaction(async (tx) => {
    const [reset] = await tx
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenHash))
    if (!reset) return false
    // Lock the account first, as issuance does, so concurrent resets cannot both succeed.
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, reset.userId))
      .for('update')
    if (!user || user.passwordHash !== reset.passwordHash) return false
    const [consumed] = await tx
      .delete(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .returning()
    if (!consumed) return false
    await tx
      .update(users)
      .set({ passwordHash: nextPasswordHash })
      .where(eq(users.id, user.id))
    await tx.delete(sessions).where(eq(sessions.userId, user.id))
    return true
  })
}
