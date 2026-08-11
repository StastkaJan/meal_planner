import { error } from '@sveltejs/kit'
import { recordClientError } from '$lib/server/observability'
import type { RequestHandler } from './$types'

const kinds = new Set(['sveltekit', 'error', 'unhandledrejection'])
const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : undefined

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json().catch(() => error(400, 'Invalid JSON'))
  if (
    !body ||
    typeof body !== 'object' ||
    !kinds.has(body.kind) ||
    typeof body.message !== 'string'
  )
    error(400, 'Invalid client error')

  recordClientError(body.kind, {
    message: text(body.message, 1000),
    stack: text(body.stack, 4000),
    path: text(body.path, 500),
    status: typeof body.status === 'number' ? body.status : undefined,
    userId: locals.user?.id,
  })
  return new Response(null, { status: 204 })
}
