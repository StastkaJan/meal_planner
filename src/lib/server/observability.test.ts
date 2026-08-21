import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  log,
  monitorService,
  observeRequests,
  recordClientError,
  renderMetrics,
  resetMetrics,
} from './observability'

describe('request observability', () => {
  beforeEach(() => {
    resetMetrics()
    vi.restoreAllMocks()
    vi.stubEnv('DEPLOYMENT_VERSION', '2026.08.18-a1b2c3')
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
      deploymentVersion: '2026.08.18-a1b2c3',
      route: '/meals',
      status: 201,
    })
    expect(renderMetrics()).toContain(
      'http_requests_total{method="GET",route="/meals",status="201"} 1',
    )
  })

  it('records and rethrows failures', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      observeRequests({
        event: {
          request: new Request('http://localhost/meals'),
          route: { id: '/meals' },
          locals: { user: { id: 7 } },
        } as any,
        resolve: async () => {
          throw new Error('password=hunter2')
        },
      }),
    ).rejects.toThrow('password=hunter2')

    const failure = error.mock.calls
      .map(([entry]) => JSON.parse(String(entry)))
      .find((entry) => entry.event === 'http_request_failed')
    expect(failure).toMatchObject({
      requestId: expect.any(String),
      deploymentVersion: '2026.08.18-a1b2c3',
      route: '/meals',
      userId: 7,
      errorType: 'Error',
      stack: expect.stringContaining('at '),
    })
    expect(JSON.stringify(failure)).not.toContain('hunter2')

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
      message: 'private meal name',
      stack: 'Error: private meal name\n    at save (file:///app/save.js:1:2)',
      path: '/meals',
    })

    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      level: 'error',
      event: 'client_error',
      kind: 'unhandledrejection',
      stack: '    at save (file:///app/save.js:1:2)',
    })
    expect(String(error.mock.calls[0][0])).not.toContain('private meal name')
    expect(renderMetrics()).toContain(
      'client_errors_total{kind="unhandledrejection"} 1',
    )
  })

  it('only logs approved evidence fields', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    log('error', 'privacy_test', {
      route: '/meals',
      userId: 7,
      password: 'hunter2',
      sessionToken: 'session-secret',
      recipeImportBody: '<html>private recipe</html>',
      email: 'person@example.com',
      body: { text: 'private body' },
      stack:
        'Error: password=hunter2\n    at save (file:///app/save.js?token=session-secret:1:2)',
    })

    const entry = JSON.parse(String(error.mock.calls[0][0]))
    expect(entry).toMatchObject({
      route: '/meals',
      userId: 7,
      deploymentVersion: '2026.08.18-a1b2c3',
      stack: '    at save (file:///app/save.js)',
    })
    expect(entry).not.toHaveProperty('password')
    expect(entry).not.toHaveProperty('sessionToken')
    expect(entry).not.toHaveProperty('recipeImportBody')
    expect(entry).not.toHaveProperty('email')
    expect(entry).not.toHaveProperty('body')
    expect(JSON.stringify(entry)).not.toMatch(
      /hunter2|session-secret|private recipe|person@example\.com|private body/,
    )
  })
})
