import { error } from '@sveltejs/kit'
import { renderMetrics } from '$lib/server/observability'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ request }) => {
  const token = process.env.METRICS_TOKEN
  if (!token || request.headers.get('authorization') !== `Bearer ${token}`) {
    error(404, 'Not found')
  }

  return new Response(renderMetrics(), {
    headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
  })
}
