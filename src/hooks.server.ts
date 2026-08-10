import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { findSessionUser } from '$lib/server/repositories/sessions'
import { observeRequests } from '$lib/server/observability'

const authenticate: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session')
  if (token) {
    const user = await findSessionUser(token)
    if (user) event.locals.user = user
  }
  return resolve(event)
}

export const handle = sequence(observeRequests, authenticate)
