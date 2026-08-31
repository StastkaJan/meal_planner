import { requireAdmin } from '$lib/server/guards'
import { listUsers } from '$lib/server/repositories/accounts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const admin = requireAdmin(locals)
  return { users: await listUsers(), currentUserId: admin.id }
}
