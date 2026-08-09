import { randomUUID } from 'node:crypto'
import type { Handle } from '@sveltejs/kit'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type RequestMetric = { count: number; durationSeconds: number }

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}
const metrics = new Map<string, RequestMetric>()
let requestsInFlight = 0

export function log(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
) {
  const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (levels[level] < (levels[configuredLevel ?? 'info'] ?? levels.info)) return

  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fields,
    }),
  )
}

function requestId(header: string | null) {
  return header && /^[a-zA-Z0-9_.:-]{1,128}$/.test(header)
    ? header
    : randomUUID()
}

export const observeRequests: Handle = async ({ event, resolve }) => {
  const id = requestId(event.request.headers.get('x-request-id'))
  const startedAt = performance.now()
  let status = 500
  requestsInFlight++

  try {
    const response = await resolve(event)
    status = response.status
    response.headers.set('x-request-id', id)
    return response
  } catch (error) {
    log('error', 'http_request_failed', {
      requestId: id,
      method: event.request.method,
      route: event.route.id ?? 'unmatched',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    requestsInFlight--
    const durationSeconds = (performance.now() - startedAt) / 1000
    const route = event.route.id ?? 'unmatched'
    const key = JSON.stringify([event.request.method, route, status])
    const metric = metrics.get(key) ?? { count: 0, durationSeconds: 0 }
    metric.count++
    metric.durationSeconds += durationSeconds
    metrics.set(key, metric)

    log(
      status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      'http_request',
      {
        requestId: id,
        method: event.request.method,
        route,
        status,
        durationMs: Math.round(durationSeconds * 1000),
      },
    )
  }
}

function label(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('"', '\\"')
}

export function renderMetrics() {
  const lines = [
    '# HELP http_requests_total Total HTTP requests.',
    '# TYPE http_requests_total counter',
  ]

  for (const [key, metric] of metrics) {
    const [method, route, status] = JSON.parse(key) as [string, string, number]
    const labels = `method="${label(method)}",route="${label(route)}",status="${status}"`
    lines.push(`http_requests_total{${labels}} ${metric.count}`)
  }

  lines.push(
    '# HELP http_request_duration_seconds_sum Total time spent serving HTTP requests.',
    '# TYPE http_request_duration_seconds_sum counter',
  )
  for (const [key, metric] of metrics) {
    const [method, route, status] = JSON.parse(key) as [string, string, number]
    const labels = `method="${label(method)}",route="${label(route)}",status="${status}"`
    lines.push(
      `http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds}`,
    )
  }

  lines.push(
    '# HELP http_requests_in_flight Current HTTP requests.',
    '# TYPE http_requests_in_flight gauge',
    `http_requests_in_flight ${requestsInFlight}`,
    '# HELP process_uptime_seconds Process uptime.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${process.uptime()}`,
    '# HELP process_resident_memory_bytes Resident memory size.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${process.memoryUsage().rss}`,
    '',
  )
  return lines.join('\n')
}

export function resetMetrics() {
  metrics.clear()
  requestsInFlight = 0
}
