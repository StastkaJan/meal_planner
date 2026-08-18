import { describe, expect, it } from 'vitest'
import dashboard from './capacity-overview.json'

describe('capacity overview dashboard', () => {
  it('covers every capacity signal', () => {
    const titles = dashboard.panels.map((panel) => panel.title)

    expect(titles).toEqual(
      expect.arrayContaining([
        'Database size',
        'Database connections used',
        'Container working-set memory',
        'Database filesystem free',
        'Slow service operations',
      ]),
    )
  })

  it('uses the low-cardinality service and operation labels', () => {
    const expressions = dashboard.panels
      .flatMap((panel) => panel.targets)
      .map((target) => target.expr)
      .join('\n')

    expect(expressions).toContain('container_memory_working_set_bytes')
    expect(expressions).toContain('slow_service_operations_total')
    expect(expressions).toContain('sum by (service, operation)')
  })
})
