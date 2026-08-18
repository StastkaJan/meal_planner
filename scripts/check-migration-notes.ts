import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const destructiveSql = [
  /\bDROP\s+(?:TABLE|COLUMN|CONSTRAINT)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/i,
  /\bRENAME\s+(?:COLUMN|TABLE|TO)\b/i,
]

export function isDestructiveMigration(sql: string) {
  const withoutComments = sql.replace(/--.*$/gm, '')
  return destructiveSql.some((pattern) => pattern.test(withoutComments))
}

export function validateRecoveryNote(note: string) {
  const headings = [...note.matchAll(/^## (.+?)\s*$/gm)].map(
    (match) => match[1],
  )
  return (
    headings.includes('Risk') &&
    headings.includes('Verification') &&
    (headings.includes('Rollback') || headings.includes('Roll-forward'))
  )
}

export async function findMigrationNoteErrors(root = process.cwd()) {
  const migrationDir = join(root, 'drizzle')
  const notesDir = join(migrationDir, 'notes')
  const files = (await readdir(migrationDir)).filter((file) =>
    file.endsWith('.sql'),
  )
  const errors: string[] = []

  for (const file of files) {
    const sql = await readFile(join(migrationDir, file), 'utf8')
    if (!isDestructiveMigration(sql)) continue

    const notePath = join(notesDir, `${basename(file, '.sql')}.md`)
    try {
      const note = await readFile(notePath, 'utf8')
      if (!validateRecoveryNote(note))
        errors.push(`${file}: recovery note is missing required headings`)
    } catch {
      errors.push(`${file}: missing ${notePath}`)
    }
  }

  return errors
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const errors = await findMigrationNoteErrors()
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Destructive migration notes are complete.')
  }
}
