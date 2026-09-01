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
    expect(productionJob).not.toContain('id: preview_config')
  })

  it('routes previews through one host-matching Caddy gateway', () => {
    const caddy = readProjectFile('monitoring/caddy/PreviewCaddyfile')
    const script = readProjectFile('scripts/deploy-preview.sh')

    expect(caddy).toContain('import /etc/caddy/routes/*.caddy')
    expect(script).toContain('@preview_$pr_number host $domain')
    expect(script).toContain('reverse_proxy $preview_id-app:3000')
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
