import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findMigrationNoteErrors,
  isDestructiveMigration,
} from './check-migration-notes'

describe('migration recovery notes', () => {
  it('recognizes destructive statements but ignores comments', () => {
    expect(
      isDestructiveMigration('ALTER TABLE meals DROP COLUMN ingredients;'),
    ).toBe(true)
    expect(
      isDestructiveMigration(
        '-- DROP TABLE meals\nALTER TABLE meals ADD COLUMN note text;',
      ),
    ).toBe(false)
    expect(isDestructiveMigration('/* DROP TABLE meals; */ SELECT 1;')).toBe(
      false,
    )
  })

  it('requires a complete note for destructive migrations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'meal-plan-migration-note-'))
    await mkdir(join(root, 'drizzle', 'notes'), { recursive: true })
    await writeFile(join(root, 'drizzle', '0001_drop.sql'), 'DROP TABLE meals;')

    expect(await findMigrationNoteErrors(root)).toHaveLength(1)

    await writeFile(
      join(root, 'drizzle', 'notes', '0001_drop.md'),
      '# Drop meals\n\n## Risk\nData.\n\n## Roll-forward\nRecreate.\n\n## Verification\nQuery it.\n',
    )
    expect(await findMigrationNoteErrors(root)).toEqual([])
  })
})
