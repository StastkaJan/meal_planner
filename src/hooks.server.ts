import { sequence } from '@sveltejs/kit/hooks'
import * as Sentry from '@sentry/sveltekit'
import type { Handle } from '@sveltejs/kit'
import { findSessionUser } from '$lib/server/repositories/sessions'
import { observeRequests } from '$lib/server/observability'

const authenticate: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session')
  if (token) {
    const user = await findSessionUser(token)
    if (user) {
      event.locals.user = user
      Sentry.setUser({ id: String(user.id) })
    }
  }
  return resolve(event)
}

export const handle = sequence(
  Sentry.sentryHandle(),
  observeRequests,
  authenticate,
)
export const handleError = Sentry.handleErrorWithSentry()
