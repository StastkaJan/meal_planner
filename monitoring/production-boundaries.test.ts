import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const compose = readFileSync(
  new URL('../docker-compose.production.yml', import.meta.url),
  'utf8',
)
const baseCompose = readFileSync(
  new URL('../docker-compose.yml', import.meta.url),
  'utf8',
)
const caddy = readFileSync(
  new URL('./caddy/Caddyfile', import.meta.url),
  'utf8',
)

describe('production network boundaries', () => {
  it('fails closed when production credentials are absent', () => {
    for (const variable of [
      'POSTGRES_PASSWORD',
      'DATABASE_URL',
      'GRAFANA_ADMIN_USER',
      'GRAFANA_ADMIN_PASSWORD',
      'RESTIC_REPOSITORY',
      'RESTIC_PASSWORD',
      'DOMAIN',
      'ACME_EMAIL',
    ]) {
      expect(compose).toContain(`\${${variable}:?`)
    }
  })

  it('removes direct app and metrics ports and limits Grafana to loopback', () => {
    expect(compose.match(/ports: !reset \[\]/g)).toHaveLength(3)
    expect(compose).toContain("- '127.0.0.1:3001:3000'")
    expect(compose).toContain("GF_AUTH_ANONYMOUS_ENABLED: 'false'")
    expect(baseCompose.match(/internal: true/g)).toHaveLength(2)
  })

  it('routes public traffic only to the app through TLS termination', () => {
    expect(compose).toContain("- '443:443'")
    expect(compose).toContain('app-blue:')
    expect(compose).toContain('app-green:')
    expect(caddy).toContain('import /etc/caddy/deploy/active-upstream.caddy')
    expect(caddy).not.toContain('grafana:')
  })
})
