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
    const publicHealth = script.indexOf('if ! public_health', switchTraffic)
    const removeOld = script.indexOf(
      'compose stop "$old_service"',
      publicHealth,
    )

    expect(start).toBeGreaterThan(-1)
    expect(switchTraffic).toBeGreaterThan(start)
    expect(publicHealth).toBeGreaterThan(switchTraffic)
    expect(removeOld).toBeGreaterThan(publicHealth)
  })

  it('takes an off-host backup before applying migrations', () => {
    const script = readProjectFile('scripts/deploy-production.sh')
    const backup = script.indexOf('compose run --rm --build backup once')
    const migrate = script.indexOf(
      'compose run --rm --no-deps "$target_service" node scripts-dist/migrate.js',
    )

    expect(backup).toBeGreaterThan(-1)
    expect(migrate).toBeGreaterThan(backup)
  })

  it('defines two production application slots behind a reloadable upstream', () => {
    const compose = readProjectFile('docker-compose.production.yml')
    const caddy = readProjectFile('monitoring/caddy/Caddyfile')

    expect(compose).toContain('app-blue:')
    expect(compose).toContain('app-green:')
    expect(caddy).toContain('import /etc/caddy/deploy/active-upstream.caddy')
  })

  it('creates the shared proxy network before starting production services', () => {
    const script = readProjectFile('scripts/deploy-production.sh')
    const createNetwork = script.indexOf('docker network create public-web')
    const startDatabase = script.indexOf('compose up -d --wait')

    expect(createNetwork).toBeGreaterThan(-1)
    expect(startDatabase).toBeGreaterThan(createNetwork)
  })

  it('passes the public production domain into the remote deployment', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')

    expect(workflow).toContain('DOMAIN: papuplan.cz')
    expect(workflow).toContain(
      'DOMAIN=$DOMAIN bash scripts/deploy-production.sh',
    )
  })

  it('reconciles the proxy without recreating shared data services', () => {
    const script = readProjectFile('scripts/deploy-production.sh')

    expect(script).toContain('backup prometheus loki alloy grafana\n')
    expect(script).toContain('compose up -d --wait --wait-timeout 120 proxy')
  })

  it('health-gates rollback before replacing the active slot', () => {
    const script = readProjectFile('scripts/deploy-production.sh')
    const rollback = script.indexOf('if [[ "$action" == rollback ]]')
    const start = script.indexOf(
      'compose up -d --no-deps --no-build --wait --wait-timeout 120 "$target_service"',
      rollback,
    )
    const switchTraffic = script.indexOf('write_upstream "$target"', start)
    const publicHealth = script.indexOf('if ! public_health', switchTraffic)
    const recordActive = script.indexOf(
      `printf '%s\\n' "$target" >.deploy/active-slot`,
      publicHealth,
    )
    const stopOld = script.indexOf('compose stop "$old_service"', recordActive)

    expect(start).toBeGreaterThan(rollback)
    expect(switchTraffic).toBeGreaterThan(start)
    expect(publicHealth).toBeGreaterThan(switchTraffic)
    expect(recordActive).toBeGreaterThan(publicHealth)
    expect(stopOld).toBeGreaterThan(recordActive)
  })

  it('fails closed without a retained rollback version', () => {
    const script = readProjectFile('scripts/deploy-production.sh')

    expect(script).toContain('missing rollback version state')
    expect(script).toContain('--no-build')
    expect(script).toContain('invalid rollback version state')
  })
})
