import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Handle } from '@sveltejs/kit'
import { release } from './release'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type RequestMetric = { count: number; durationSeconds: number }
type RequestContext = { requestId: string; route: string }

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}
const metrics = new Map<string, RequestMetric>()
const serviceMetrics = new Map<string, RequestMetric>()
const clientErrorMetrics = new Map<string, number>()
const requestContext = new AsyncLocalStorage<RequestContext>()
let requestsInFlight = 0

const stringFields: Record<string, number> = {
  requestId: 128,
  method: 16,
  route: 500,
  service: 100,
  operation: 100,
  outcome: 20,
  kind: 50,
  errorType: 100,
}
const numberFields = new Set(['status', 'durationMs', 'userId'])

function safeLabel(value: string, fallback: string) {
  return /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) ? value : fallback
}

function sanitizeStack(stack: string) {
  const frames = stack
    .split('\n')
    .filter((line) => line.trimStart().startsWith('at '))
    .slice(0, 20)
    .map((line) =>
      line.replace(/\/\/[^/@\s]+@/g, '//').replace(/([?#])[^)\s]+/g, ''),
    )
    .join('\n')
    .slice(0, 8000)
  return frames || undefined
}

function sanitizeFields(fields: Record<string, unknown>) {
  const sanitized: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'stack' && typeof value === 'string') {
      const stack = sanitizeStack(value)
      if (stack) sanitized.stack = stack
    } else if (key in stringFields && typeof value === 'string') {
      sanitized[key] = value.replace(/[\r\n]/g, ' ').slice(0, stringFields[key])
    } else if (
      numberFields.has(key) &&
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      sanitized[key] = value
    }
  }
  return sanitized
}

function errorEvidence(error: unknown) {
  if (!(error instanceof Error)) return { errorType: 'NonError' }
  return {
    errorType: safeLabel(error.name, 'Error'),
    stack: error.stack,
  }
}

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
      event: safeLabel(event, 'invalid_event'),
      ...sanitizeFields(fields),
      ...requestContext.getStore(),
      deploymentVersion: safeLabel(
        process.env.DEPLOYMENT_VERSION ?? 'unknown',
        'unknown',
      ),
    }),
  )
}

export async function monitorService<T>(
  service: string,
  operation: string,
  task: () => Promise<T>,
) {
  const startedAt = performance.now()
  let outcome = 'success'
  let failure: unknown

  try {
    return await task()
  } catch (error) {
    outcome = 'error'
    failure = error
    throw error
  } finally {
    const durationSeconds = (performance.now() - startedAt) / 1000
    const key = JSON.stringify([service, operation, outcome])
    const metric = serviceMetrics.get(key) ?? {
      count: 0,
      durationSeconds: 0,
    }
    metric.count++
    metric.durationSeconds += durationSeconds
    serviceMetrics.set(key, metric)

    log(outcome === 'error' ? 'error' : 'info', 'service_operation', {
      service,
      operation,
      outcome,
      durationMs: Math.round(durationSeconds * 1000),
      ...(failure === undefined ? {} : errorEvidence(failure)),
    })
  }
}

export function recordClientError(
  kind: string,
  fields: Record<string, unknown>,
) {
  clientErrorMetrics.set(kind, (clientErrorMetrics.get(kind) ?? 0) + 1)
  log('error', 'client_error', { kind, ...fields })
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

  const route = event.route.id ?? 'unmatched'
  return requestContext.run({ requestId: id, route }, async () => {
    try {
      const response = await resolve(event)
      status = response.status
      response.headers.set('x-request-id', id)
      return response
    } catch (error) {
      log('error', 'http_request_failed', {
        requestId: id,
        method: event.request.method,
        route,
        userId: event.locals.user?.id,
        ...errorEvidence(error),
      })
      throw error
    } finally {
      requestsInFlight--
      const durationSeconds = (performance.now() - startedAt) / 1000
      const key = JSON.stringify([event.request.method, route, status])
      const metric = metrics.get(key) ?? { count: 0, durationSeconds: 0 }
      metric.count++
      metric.durationSeconds += durationSeconds
      metrics.set(key, metric)

      log(
        status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        'http_request',
        {
          method: event.request.method,
          route,
          status,
          durationMs: Math.round(durationSeconds * 1000),
        },
      )
    }
  })
}

function label(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('"', '\\"')
}

export function renderMetrics() {
  const lines = [
    '# HELP app_release_info Application release identity.',
    '# TYPE app_release_info gauge',
    `app_release_info{release="${release}"} 1`,
    '# HELP http_requests_total Total HTTP requests.',
    '# TYPE http_requests_total counter',
  ]

  for (const [key, metric] of metrics) {
    const [method, route, status] = JSON.parse(key) as [string, string, number]
    const labels = `method="${label(method)}",route="${label(route)}",status="${status}"`
    lines.push(`http_requests_total{${labels}} ${metric.count}`)
  }

  lines.push(
    '# HELP service_operations_total Total backend service operations.',
    '# TYPE service_operations_total counter',
  )
  for (const [key, metric] of serviceMetrics) {
    const [service, operation, outcome] = JSON.parse(key) as [
      string,
      string,
      string,
    ]
    const labels = `service="${label(service)}",operation="${label(operation)}",outcome="${label(outcome)}"`
    lines.push(`service_operations_total{${labels}} ${metric.count}`)
  }

  lines.push(
    '# HELP client_errors_total Total errors reported by browsers.',
    '# TYPE client_errors_total counter',
  )
  for (const [kind, count] of clientErrorMetrics) {
    lines.push(`client_errors_total{kind="${label(kind)}"} ${count}`)
  }

  lines.push(
    '# HELP service_operation_duration_seconds_sum Total time spent in backend service operations.',
    '# TYPE service_operation_duration_seconds_sum counter',
  )
  for (const [key, metric] of serviceMetrics) {
    const [service, operation, outcome] = JSON.parse(key) as [
      string,
      string,
      string,
    ]
    const labels = `service="${label(service)}",operation="${label(operation)}",outcome="${label(outcome)}"`
    lines.push(
      `service_operation_duration_seconds_sum{${labels}} ${metric.durationSeconds}`,
    )
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
  serviceMetrics.clear()
  clientErrorMetrics.clear()
  requestsInFlight = 0
}
