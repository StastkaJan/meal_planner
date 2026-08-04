import { fail, redirect } from '@sveltejs/kit'
import {
  authenticate,
  checkRateLimit,
  createSession,
} from '$lib/server/services/auth'
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

    const user = await authenticate(email, password)
    if (!user) {
      return fail(400, { error: 'Invalid email or password' })
    }

    await createSession(user.id, cookies)
    redirect(303, '/')
  },
}
