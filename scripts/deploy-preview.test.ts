import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

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
  })

  it('publishes previews below the production base domain', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')

    expect(workflow).toContain('PREVIEW_BASE_DOMAIN: papuplan.cz')
    expect(workflow).toContain(
      'url: https://pr-${{ github.event.pull_request.number }}.papuplan.cz',
    )
    expect(workflow).not.toContain('test.papuplan.cz')
  })

  it('loads production data once without copying live sessions', () => {
    const workflow = readProjectFile('.github/workflows/quality.yml')
    const script = readProjectFile('scripts/deploy-preview.sh')

    expect(workflow).toContain('PREVIEW_PRODUCTION_ROOT="$base/meal-plan"')
    expect(script).toContain('production-snapshot')
    expect(script).toContain('pg_dump')
    expect(script).toContain('--exclude-table-data=public.sessions')
    expect(script).toContain(
      'DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE',
    )
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
