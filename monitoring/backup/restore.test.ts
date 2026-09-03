import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const compose = readFileSync('docker-compose.yml', 'utf8')
const backup = readFileSync('monitoring/backup/backup.sh', 'utf8')
const restore = readFileSync('monitoring/backup/restore.sh', 'utf8')
const crontab = readFileSync('monitoring/backup/crontab', 'utf8')

describe('database restore verification', () => {
  it('creates a Restic snapshot that can be restored', () => {
    expect(backup).toContain('mktemp /tmp/mealplan-dump-XXXXXX')
    expect(backup).toContain('--stdin --stdin-filename mealplan.dump')
  })

  it('does no repository work merely because the scheduler restarted', () => {
    const schedule = backup.indexOf('if [ "$mode" = \'schedule\' ]')
    const scheduler = backup.indexOf('exec crond', schedule)
    const repositoryAccess = backup.indexOf('restic cat config')

    expect(schedule).toBeGreaterThan(-1)
    expect(scheduler).toBeGreaterThan(schedule)
    expect(repositoryAccess).toBeGreaterThan(scheduler)
  })

  it('reports repository access failures without trying to initialize', () => {
    const repositoryAccess = backup.indexOf('restic cat config')
    const accessFailure = backup.indexOf(
      "notify_failure 'repository access check failed'",
    )

    expect(repositoryAccess).toBeGreaterThan(-1)
    expect(accessFailure).toBeGreaterThan(repositoryAccess)
  })

  it('only restores into the guarded disposable database', () => {
    expect(compose).toContain('/var/lib/postgresql/data')
    expect(compose).toContain('init-restore-db.sql')
    expect(restore.indexOf('restore_guard.disposable_target')).toBeLessThan(
      restore.indexOf('restic restore'),
    )
  })

  it('runs after the daily backup and removes restored data', () => {
    expect(crontab).toContain('0 2 * * * /usr/local/bin/backup')
    expect(crontab).toContain('0 3 * * * /usr/local/bin/restore')
    expect(crontab).toContain('0 4 * * 0 /usr/local/bin/backup retention')
    expect(restore.match(/reset_database/g)?.length).toBeGreaterThanOrEqual(4)
  })
})
