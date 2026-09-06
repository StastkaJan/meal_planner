import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const fixtures: string[] = []
afterEach(() => {
  for (const fixture of fixtures.splice(0))
    rmSync(fixture, { recursive: true, force: true })
})

function previewFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'meal-plan-preview-'))
  fixtures.push(directory)
  for (const child of ['scripts', 'bin', 'edge', 'state/env'])
    mkdirSync(join(directory, child), { recursive: true })
  writeFileSync(
    join(directory, 'scripts/deploy-preview.sh'),
    readProjectFile('scripts/deploy-preview.sh'),
  )
  for (const file of ['docker-compose.yml', 'Caddyfile'])
    writeFileSync(join(directory, 'edge', file), '')
  const log = join(directory, 'commands.log')
  writeFileSync(log, '')
  const commands = {
    docker:
      'printf "%s\\n" "$*" >> "$PREVIEW_TEST_LOG"\nif [[ "$*" == *"run --rm --no-deps demo-seed"* && "${PREVIEW_TEST_FAIL_SEED:-}" == 1 ]]; then exit 1; fi',
    curl: 'exit 0',
    flock: 'exit 0',
    openssl: 'printf "%064d\\n" 0',
  }
  for (const [name, body] of Object.entries(commands))
    writeFileSync(
      join(directory, 'bin', name),
      `#!/usr/bin/env bash\n${body}\n`,
      { mode: 0o755 },
    )
  const bash =
    process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
  const seedMarker = join(directory, 'state/env/pr-42.demo-seeded')
  const legacyMarker = join(directory, 'state/env/pr-42.production-snapshot')
  const run = (failSeed = false) =>
    spawnSync(
      bash,
      [
        '-c',
        'export PATH="$(cd "$PREVIEW_TEST_BIN" && pwd):$PATH"; exec bash scripts/deploy-preview.sh deploy 42 test-release',
      ],
      {
        cwd: directory,
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          PREVIEW_ROOT: join(directory, 'state').replaceAll('\\', '/'),
          PREVIEW_EDGE_ROOT: join(directory, 'edge').replaceAll('\\', '/'),
          PREVIEW_BASE_DOMAIN: 'example.test',
          PREVIEW_TEST_BIN: join(directory, 'bin').replaceAll('\\', '/'),
          PREVIEW_TEST_LOG: log.replaceAll('\\', '/'),
          PREVIEW_TEST_FAIL_SEED: failSeed ? '1' : '',
        },
      },
    )
  return { run, log, seedMarker, legacyMarker }
}

describe('pull request previews', () => {
  it('isolates each preview database and keeps it off host ports', () => {
    const compose = readProjectFile('docker-compose.preview.yml')

    expect(compose).toContain('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD')
    expect(compose).toContain('internal: true')
    expect(compose).not.toContain('ports:')
  })

  it('deploys same-repository pull requests only after quality passes', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')
    const productionJob = workflow.slice(
      workflow.indexOf('\n  deploy:'),
      workflow.indexOf('\n  preview:'),
    )
    const previewJob = workflow.slice(workflow.indexOf('\n  preview:'))

    expect(previewJob).toContain(
      'github.event.pull_request.head.repo.full_name == github.repository',
    )
    expect(previewJob).toContain('needs: quality')
    expect(previewJob).toContain('id: preview_config')
    expect(previewJob).toContain('echo "enabled=false" >> "$GITHUB_OUTPUT"')
    expect(previewJob).toContain('bash scripts/deploy-preview.sh deploy')
    expect(previewJob).toContain(
      'secrets.PREVIEW_VPS_SSH_KEY || secrets.VPS_SSH_KEY',
    )
    expect(productionJob).not.toContain('id: preview_config')
  })

  it('writes an exact-host route for the portfolio Caddy', () => {
    const script = readProjectFile('scripts/deploy-preview.sh')

    expect(script).toContain('PREVIEW_EDGE_ROOT')
    expect(script).toContain('$domain {')
    expect(script).toContain('reverse_proxy $preview_id-app:3000')
    expect(script).toContain('edge_compose exec -T caddy caddy reload')
    for (const file of ['quality.yml', 'preview-cleanup.yml']) {
      const workflow = readProjectFile(`.github/workflows/${file}`)
      expect(workflow).toContain('PREVIEW_EDGE_ROOT="/home/github/portfolio"')
      expect(workflow).not.toContain('PREVIEW_EDGE_ROOT="$base/portfolio"')
    }
  })

  it('publishes previews below the production base domain', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')

    expect(workflow).toContain('PREVIEW_BASE_DOMAIN: papuplan.cz')
    expect(workflow).toContain(
      'url: https://pr-${{ github.event.pull_request.number }}.papuplan.cz',
    )
    expect(workflow).not.toContain('test.papuplan.cz')
  })

  it('seeds demo data after migrations without accessing production', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')
    const script = readProjectFile('scripts/deploy-preview.sh')
    const compose = readProjectFile('docker-compose.preview.yml')

    expect(workflow).not.toContain('PREVIEW_PRODUCTION_ROOT')
    expect(script).not.toMatch(
      /PREVIEW_PRODUCTION_ROOT|production_compose|pg_dump|\.env\.production/,
    )
    expect(compose).toMatch(
      /demo-seed:[\s\S]*?target: build[\s\S]*?command: npm run db:seed:preview/,
    )
    expect(script).toContain('if [[ ! -f "$seed_marker" ]]; then')
    const migrate = script.indexOf('app node scripts-dist/migrate.js')
    const seed = script.indexOf('compose run --rm --no-deps demo-seed')
    const marker = script.indexOf('mv "$seed_marker.tmp" "$seed_marker"')
    const start = script.indexOf('compose up -d --no-deps')
    expect(migrate).toBeGreaterThan(-1)
    expect(seed).toBeGreaterThan(migrate)
    expect(marker).toBeGreaterThan(seed)
    expect(start).toBeGreaterThan(marker)
  })

  it('recreates legacy previews once, then preserves demo data on redeploy', () => {
    const fixture = previewFixture()
    writeFileSync(fixture.legacyMarker, 'old-release')
    const first = fixture.run()
    expect(first.status, first.stderr).toBe(0)
    const commands = readFileSync(fixture.log, 'utf8')
    expect(commands).toMatch(
      /--project-name meal-plan-pr-42 .*down --volumes --remove-orphans/,
    )
    expect(commands.indexOf('down --volumes')).toBeLessThan(
      commands.indexOf('app node scripts-dist/migrate.js'),
    )
    expect(commands.indexOf('app node scripts-dist/migrate.js')).toBeLessThan(
      commands.indexOf('run --rm --no-deps demo-seed'),
    )
    expect(existsSync(fixture.legacyMarker)).toBe(false)
    expect(existsSync(fixture.seedMarker)).toBe(true)

    writeFileSync(fixture.log, '')
    const second = fixture.run()
    expect(second.status, second.stderr).toBe(0)
    const redeploy = readFileSync(fixture.log, 'utf8')
    expect(redeploy).not.toContain('down --volumes')
    expect(redeploy).toContain('run --rm --no-deps demo-seed')
    expect(redeploy).toContain('app node scripts-dist/migrate.js')
  })

  it('does not publish or mark a preview initialized when seeding fails', () => {
    const fixture = previewFixture()
    const result = fixture.run(true)
    expect(result.status, result.stderr).toBe(1)
    expect(existsSync(fixture.seedMarker)).toBe(false)
    const commands = readFileSync(fixture.log, 'utf8')
    expect(commands).toContain('run --rm --no-deps demo-seed')
    expect(commands).not.toContain('up -d --no-deps --wait')
  })

  it('removes the route, containers, image, and volume when a pull request closes', () => {
    const script = readProjectFile('scripts/deploy-preview.sh')
    const workflow = readProjectFile('.github/workflows/preview-cleanup.yml')

    expect(workflow).toContain('pull_request_target:')
    expect(workflow).toContain('types: [closed]')
    expect(workflow).toContain('id: preview_config')
    expect(workflow).toContain('bash scripts/deploy-preview.sh delete')
    expect(script).toContain('rm -f "$route_file"')
    expect(script).toContain('down --volumes --remove-orphans --rmi local')
  })
})
