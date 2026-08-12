import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './+server'

describe('GET /metrics', () => {
  afterEach(() => delete process.env.METRICS_TOKEN)

  it('requires the configured bearer token', async () => {
    process.env.METRICS_TOKEN = 'scrape-secret'

    expect(() =>
      GET({ request: new Request('http://localhost/metrics') } as any),
    ).toThrow()

    const response = await GET({
      request: new Request('http://localhost/metrics', {
        headers: { authorization: 'Bearer scrape-secret' },
      }),
    } as any)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain(
      '# TYPE http_requests_total counter',
    )
  })
})
