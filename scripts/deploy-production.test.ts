import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('production deployment', () => {
  it('keeps production secrets out of the Docker build context', () => {
    expect(readProjectFile('.dockerignore')).toContain('.env*')
  })

  it('switches Caddy only after the inactive slot is healthy', () => {
    const script = readProjectFile('scripts/deploy-production.sh')
    const start = script.indexOf(
      'compose up -d --no-deps --wait --wait-timeout 120 "$target_service"',
    )
    const switchTraffic = script.indexOf('write_upstream "$target"', start)
    const publicHealth = script.indexOf(
      '"https://$domain/health"',
      switchTraffic,
    )
    const removeOld = script.indexOf(
      'compose stop "$old_service"',
      publicHealth,
    )

    expect(start).toBeGreaterThan(-1)
    expect(switchTraffic).toBeGreaterThan(start)
    expect(publicHealth).toBeGreaterThan(switchTraffic)
    expect(removeOld).toBeGreaterThan(publicHealth)
  })

  it('defines two production application slots behind a reloadable upstream', () => {
    const compose = readProjectFile('docker-compose.production.yml')
    const caddy = readProjectFile('monitoring/caddy/Caddyfile')

    expect(compose).toContain('app-blue:')
    expect(compose).toContain('app-green:')
    expect(caddy).toContain('import /etc/caddy/deploy/active-upstream.caddy')
  })
})
