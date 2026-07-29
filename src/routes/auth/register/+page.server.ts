import { fail, redirect } from '@sveltejs/kit'
import { createSession, checkRateLimit, MAX_PASSWORD } from '$lib/auth'
import { register } from '$lib/server/services/auth'
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

    const user = await register(email, password)
    if (!user) return fail(400, { error: 'Email already in use' })

    await createSession(user.id, cookies)
    redirect(303, '/')
  },
}
