import type { Handle } from '@sveltejs/kit'
import { findSessionUser } from '$lib/server/repositories/sessions'

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session')
  if (token) {
    const user = await findSessionUser(token)
    if (user) event.locals.user = user
  }
  return resolve(event)
}
