import type { RequestHandler } from './$types'
import { renderMetrics } from '$lib/server/observability'
import { getPoolStats } from '$lib/server/repositories/health'

export const GET: RequestHandler = () =>
  new Response(renderMetrics(getPoolStats()), {
    headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
  })
