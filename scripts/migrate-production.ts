import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

type Run = (command: string, args: string[]) => void

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`${command} exited with status ${result.status}`)
}

export function migrateProduction(run: Run = runCommand) {
  console.log('Building and taking a pre-migration backup...')
  run('docker', [
    'compose',
    '--profile',
    'production',
    'run',
    '--rm',
    '--build',
    'backup',
    'once',
  ])

  console.log('Backup succeeded; applying migrations...')
  run('docker', [
    'compose',
    'run',
    '--rm',
    '--build',
    '--entrypoint',
    'npx',
    'app',
    'drizzle-kit',
    'migrate',
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  migrateProduction()
