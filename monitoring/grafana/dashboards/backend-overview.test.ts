import { describe, expect, it } from 'vitest'
import dashboard from './backend-overview.json'

describe('backend overview dashboard', () => {
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
