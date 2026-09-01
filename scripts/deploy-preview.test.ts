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

    expect(workflow).toContain(
      'github.event.pull_request.head.repo.full_name == github.repository',
    )
    expect(workflow).toContain('needs: quality')
    expect(workflow).toContain('id: preview_config')
    expect(workflow).toContain('echo "enabled=false" >> "$GITHUB_OUTPUT"')
    expect(workflow).toContain('bash scripts/deploy-preview.sh deploy')
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
