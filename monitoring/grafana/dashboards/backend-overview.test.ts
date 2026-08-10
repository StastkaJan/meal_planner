import { describe, expect, it } from 'vitest'
import dashboard from './backend-overview.json'

describe('backend overview dashboard', () => {
  it('uses a non-empty Loki matcher for all services', () => {
    expect(dashboard.templating.list[0].allValue).toBe('.+')
  })
})
