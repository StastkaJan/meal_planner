import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8')

describe('alerting configuration', () => {
  it.each([
    ['SustainedHttp5xxErrors', '5m'],
    ['HealthCheckFailed', '2m'],
    ['HighHttpLatency', '10m'],
    ['HostDiskSpaceLow', '15m'],
  ])('keeps %s sustained for %s', (name, duration) => {
    expect(read('./alerts.yml')).toMatch(
      new RegExp(`alert: ${name}[\\s\\S]*?for: ${duration}`),
    )
  })

  it('routes every alert through one secret-backed receiver', () => {
    const config = read('./alertmanager.yml')

    expect(config.match(/^  - name:/gm)).toHaveLength(1)
    expect(config).toContain('receiver: operator-slack')
    expect(config).toContain('api_url_file: /run/secrets/alert_webhook_url')
  })

  it('sends backup failures to Alertmanager without private data', () => {
    const script = read('./backup/backup.sh')
    const payload = script.match(/-d "(.*)"/)?.[1]

    expect(script).toContain('$ALERTMANAGER_URL/api/v2/alerts')
    expect(payload).toContain('BackupFailed')
    expect(payload).not.toContain('DATABASE_URL')
    expect(payload).not.toContain('RESTIC')
  })
})
