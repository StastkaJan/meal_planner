import type { RequestHandler } from './$types'
import { renderMetrics } from '$lib/server/observability'

export const GET: RequestHandler = () =>
  new Response(renderMetrics(), {
    headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
  })
