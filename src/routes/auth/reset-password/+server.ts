import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { checkRateLimit, MAX_PASSWORD } from '$lib/server/services/auth'
import { resetPassword } from '$lib/server/services/password-reset'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({
  request,
  getClientAddress,
  cookies,
}) => {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    return json({ error: 'Invalid JSON' }, { status: 415 })
  if (!checkRateLimit(`reset:${getClientAddress()}`))
    return json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429 },
    )
  const body = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      password: z.string().min(8).max(MAX_PASSWORD),
    })
    .safeParse(await request.json().catch(() => null))
  if (!body.success)
    return json(
      {
        error:
          'Use a valid reset link and a password between 8 and 128 characters.',
      },
      { status: 400 },
    )
  if (!(await resetPassword(body.data.token, body.data.password)))
    return json(
      { error: 'This reset link is invalid or expired. Request a new one.' },
      { status: 400 },
    )
  cookies.delete('session', { path: '/' })
  return json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
