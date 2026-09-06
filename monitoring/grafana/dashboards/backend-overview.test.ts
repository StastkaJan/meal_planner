import { describe, expect, it } from 'vitest'
import dashboard from './backend-overview.json'

describe('backend overview dashboard', () => {
  it('shows route tail latency, database queues, and event-loop delay', () => {
    const expressions = dashboard.panels
      .flatMap((panel) => panel.targets.map((target) => target.expr))
      .join('\n')
    expect(expressions).toContain('histogram_quantile(0.95')
    expect(expressions).toContain('db_pool_waiting_requests')
    expect(expressions).toContain('node_event_loop_delay_p99_seconds')
  })
  it('uses a non-empty Loki matcher for all services', () => {
    expect(dashboard.templating.list[0].allValue).toBe('.+')
  })

  it('includes browser error metrics and logs', () => {
    expect(
      dashboard.panels.some((panel) => panel.title === 'Browser error rate'),
    ).toBe(true)
    expect(
      dashboard.panels.some((panel) => panel.title === 'Browser errors'),
    ).toBe(true)
  })

  it('shows authentication rate-limit rejections without IP labels', () => {
    const panel = dashboard.panels.find(
      (candidate) => candidate.title === 'Authentication rate-limit rejections',
    )

    const expression = panel?.targets[0]?.expr
    expect(expression).toBe(
      'sum(increase(http_requests_total{route=~"/auth/(login|register)",status="429"}[15m])) or vector(0)',
    )
    expect(expression).not.toMatch(/\bip\b/)
  })
})
