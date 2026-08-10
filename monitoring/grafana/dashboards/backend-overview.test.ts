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
})
