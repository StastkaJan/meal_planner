import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import dashboard from './capacity-overview.json'

const compose = readFileSync('docker-compose.yml', 'utf8')
const productionCompose = readFileSync('docker-compose.production.yml', 'utf8')

function service(name: string) {
  return compose.split(`\n  ${name}:\n`)[1]?.split(/\n  \S/)[0] ?? ''
}

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
    expect(expressions).toContain('app(-blue|-green)?')
  })

  it('keeps exporters private and uses production database credentials', () => {
    expect(service('postgres-exporter')).toMatch(
      /networks:[\s\S]*- database[\s\S]*- monitoring/,
    )
    expect(service('cadvisor')).toMatch(/networks:[\s\S]*- monitoring/)
    expect(productionCompose).toContain(
      'DATA_SOURCE_NAME: ${DATABASE_URL:?Set DATABASE_URL',
    )
  })
})
