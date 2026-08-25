import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { findSessionUser } from '$lib/server/repositories/sessions'
import { observeRequests } from '$lib/server/observability'
import { localeFromAcceptLanguage, parseLocale } from '$lib/i18n'

const authenticate: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session')
  if (token) {
    const user = await findSessionUser(token)
    if (user) event.locals.user = { ...user, locale: parseLocale(user.locale) }
  }
  event.locals.locale =
    parseLocale(event.locals.user?.locale) ??
    parseLocale(event.cookies.get('locale')) ??
    localeFromAcceptLanguage(event.request.headers.get('accept-language'))
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', event.locals.locale),
  })
}

export const handle = sequence(observeRequests, authenticate)
