import { redirect } from '@sveltejs/kit'
import { deleteSession } from '$lib/server/repositories/sessions'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session')
  if (token) {
    await deleteSession(token)
    cookies.delete('session', { path: '/' })
  }
  redirect(303, '/auth/login')
}
