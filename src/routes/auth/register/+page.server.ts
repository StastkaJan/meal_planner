import { fail, redirect } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { users } from '$lib/schema'
import {
  hashPassword,
  createSession,
  checkRateLimit,
  MAX_PASSWORD,
} from '$lib/auth'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
    if (!checkRateLimit(ip))
      return fail(429, { error: 'Too many attempts. Try again later.' })

    const d = await request.formData()
    const email = String(d.get('email')).toLowerCase().trim()
    const password = String(d.get('password'))

    if (password.length < 8)
      return fail(400, { error: 'Password must be at least 8 characters' })
    if (password.length > MAX_PASSWORD)
      return fail(400, { error: 'Password must be at most 128 characters' })

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

    await createSession(user.id, cookies)
    redirect(303, '/')
  },
}
