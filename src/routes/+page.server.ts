import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url }) => {
  // Keep existing bookmarks to a specific planner week or recipe picker working.
  if (
    ['plan', 'week', 'pickDate', 'pickSlot'].some((key) =>
      url.searchParams.has(key),
    )
  ) {
    redirect(307, `/planner${url.search}`)
  }
}
