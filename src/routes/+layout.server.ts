import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { getPendingLegalNotices } from '$lib/server/services/legal'

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (
    !locals.user &&
    !url.pathname.startsWith('/auth') &&
    !url.pathname.startsWith('/legal/') &&
    url.pathname !== '/pricing'
  ) {
    redirect(303, '/auth/login')
  }
  return {
    user: locals.user,
    locale: locals.locale,
    legalNotices: locals.user
      ? await getPendingLegalNotices(locals.user.id)
      : [],
  }
}
