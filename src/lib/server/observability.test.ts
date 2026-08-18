import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  monitorService,
  observeRequests,
  recordClientError,
  renderMetrics,
  resetMetrics,
} from './observability'
import { release } from './release'

describe('request observability', () => {
  beforeEach(() => {
    resetMetrics()
    vi.restoreAllMocks()
  })

  it('logs and records requests with a correlation ID', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = await observeRequests({
      event: {
        request: new Request('http://localhost/meals', {
          headers: { 'x-request-id': 'req-1' },
        }),
        route: { id: '/meals' },
      } as any,
      resolve: async () => new Response(null, { status: 201 }),
    })

    expect(response.headers.get('x-request-id')).toBe('req-1')
    expect(JSON.parse(String(info.mock.calls[0][0]))).toMatchObject({
      level: 'info',
      event: 'http_request',
      requestId: 'req-1',
      route: '/meals',
      status: 201,
      release,
    })
    expect(renderMetrics()).toContain(
      `app_release_info{release="${release}"} 1`,
    )
    expect(renderMetrics()).toContain(
      'http_requests_total{method="GET",route="/meals",status="201"} 1',
    )
  })

  it('records and rethrows failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      observeRequests({
        event: {
          request: new Request('http://localhost/meals'),
          route: { id: '/meals' },
        } as any,
        resolve: async () => {
          throw new Error('boom')
        },
      }),
    ).rejects.toThrow('boom')

    expect(renderMetrics()).toContain(
      'http_requests_total{method="GET",route="/meals",status="500"} 1',
    )
  })

  it('correlates service logs and records service outcomes', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await observeRequests({
      event: {
        request: new Request('http://localhost/meals', {
          headers: { 'x-request-id': 'req-service' },
        }),
        route: { id: '/meals' },
      } as any,
      resolve: async () => {
        await monitorService('meals', 'create', async () => 1)
        await expect(
          monitorService('meals', 'update', async () => {
            throw new Error('database unavailable')
          }),
        ).rejects.toThrow('database unavailable')
        return new Response()
      },
    })

    const serviceLog = info.mock.calls
      .map(([entry]) => JSON.parse(String(entry)))
      .find((entry) => entry.event === 'service_operation')
    expect(serviceLog).toMatchObject({
      requestId: 'req-service',
      service: 'meals',
      operation: 'create',
      outcome: 'success',
    })
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      requestId: 'req-service',
      service: 'meals',
      operation: 'update',
      outcome: 'error',
    })
    expect(renderMetrics()).toContain(
      'service_operations_total{service="meals",operation="create",outcome="success"} 1',
    )
    expect(renderMetrics()).toContain(
      'service_operations_total{service="meals",operation="update",outcome="error"} 1',
    )
  })

  it('logs and counts browser errors by kind', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    recordClientError('unhandledrejection', {
      message: 'failed to save',
      path: '/meals',
    })

    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      level: 'error',
      event: 'client_error',
      kind: 'unhandledrejection',
      message: 'failed to save',
    })
    expect(renderMetrics()).toContain(
      'client_errors_total{kind="unhandledrejection"} 1',
    )
  })
})
