import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8')
const compose = readFileSync('docker-compose.yml', 'utf8')
const productionCompose = readFileSync('docker-compose.production.yml', 'utf8')

function service(name: string) {
  return compose.split(`\n  ${name}:\n`)[1]?.split(/\n  \S/)[0] ?? ''
}

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
    expect(productionCompose).toContain('environment: ALERT_WEBHOOK_URL')
    expect(productionCompose).not.toContain('ALERT_WEBHOOK_URL_FILE')
  })

  it('keeps alerting services on the private monitoring network', () => {
    for (const name of [
      'backup',
      'prometheus',
      'alertmanager',
      'blackbox-exporter',
      'node-exporter',
    ]) {
      expect(service(name)).toMatch(/networks:[\s\S]*- monitoring/)
    }
  })

  it.each([
    ['./backup/backup.sh', 'BackupFailed'],
    ['./backup/restore.sh', 'RestoreVerificationFailed'],
  ])(
    'sends %s failures to Alertmanager without private data',
    (file, alert) => {
      const script = read(file)
      const payload = script.match(/-d "(.*)"/)?.[1]

      expect(script).toContain('$ALERTMANAGER_URL/api/v2/alerts')
      expect(payload).toContain(alert)
      expect(payload).not.toContain('DATABASE_URL')
      expect(payload).not.toContain('RESTIC')
    },
  )
})
