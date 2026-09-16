import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { checkRateLimit } from '$lib/server/services/auth'
import {
  hashResetToken,
  passwordResetConfigured,
  requestPasswordReset,
} from '$lib/server/services/password-reset'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({
  request,
  getClientAddress,
  locals,
}) => {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    return json({ error: 'Invalid JSON' }, { status: 415 })
  if (!checkRateLimit(`forgot:${getClientAddress()}`))
    return json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429 },
    )
  const body = z
    .object({ email: z.string().trim().toLowerCase().max(254).email() })
    .safeParse(await request.json().catch(() => null))
  if (!body.success)
    return json({ error: 'Enter a valid email address' }, { status: 400 })
  if (!passwordResetConfigured())
    return json(
      { error: 'Password reset is temporarily unavailable. Try again later.' },
      { status: 503 },
    )
  if (checkRateLimit(`forgot-email:${hashResetToken(body.data.email)}`)) {
    // Node process sends in the background to keep account lookup/delivery timing private.
    // ponytail: no durable queue; a process restart can drop a request. Users can request another link.
    void requestPasswordReset(body.data.email, locals.locale).catch(() => {})
  }
  return json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
