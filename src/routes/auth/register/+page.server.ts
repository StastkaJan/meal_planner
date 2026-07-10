import { fail, redirect } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { sessions, users } from '$lib/schema'
import { hashPassword, generateToken } from '$lib/auth'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const d = await request.formData()
    const email = String(d.get('email')).toLowerCase().trim()
    const password = String(d.get('password'))

    if (password.length < 8)
      return fail(400, { error: 'Password must be at least 8 characters' })

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (existing) return fail(400, { error: 'Email already in use' })

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: await hashPassword(password) })
      .returning()

    const token = generateToken()
    await db.insert(sessions).values({
      id: token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    })
    redirect(303, '/')
  },
}
