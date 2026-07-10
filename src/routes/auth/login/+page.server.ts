import { fail, redirect } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { sessions, users } from '$lib/schema'
import { verifyPassword, generateToken } from '$lib/auth'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const d = await request.formData()
    const email = String(d.get('email')).toLowerCase().trim()
    const password = String(d.get('password'))

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return fail(400, { error: 'Invalid email or password' })
    }

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
