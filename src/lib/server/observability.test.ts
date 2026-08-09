import { beforeEach, describe, expect, it, vi } from 'vitest'
import { observeRequests, renderMetrics, resetMetrics } from './observability'

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
    })
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
})
