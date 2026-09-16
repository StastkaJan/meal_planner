import { sequence } from '@sveltejs/kit/hooks'
import { building } from '$app/environment'
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
  const landingLocale =
    !building && event.url.pathname === '/'
      ? parseLocale(event.url.searchParams.get('lang'))
      : null
  if (landingLocale) {
    event.cookies.set('locale', landingLocale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  event.locals.locale =
    landingLocale ??
    parseLocale(event.locals.user?.locale) ??
    parseLocale(event.cookies.get('locale')) ??
    localeFromAcceptLanguage(event.request.headers.get('accept-language'))
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', event.locals.locale),
  })
}

export const handle = sequence(observeRequests, authenticate)
