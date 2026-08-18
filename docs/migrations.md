# Production migrations

Run production schema changes only with:

```bash
npm run db:migrate:production
```

The command builds and runs the existing backup container, waits for its
encrypted off-host Restic snapshot to succeed, then runs Drizzle. A failed
backup stops the migration. Keep `npm run db:migrate` for local development.

## Compatibility policy

Use separate releases when old and new application versions may overlap:

1. **Expand:** add nullable columns, tables, or indexes without removing or
   changing fields the running application reads or writes.
2. **Migrate:** deploy compatible code, backfill in retry-safe batches, and
   verify row counts, constraints, application health, and logs.
3. **Contract:** after the rollback window and verification, remove the old
   path in a later migration and release.

Do not combine a required backfill and removal of its source column in one
migration. Prefer roll-forward for an applied migration; restoring a backup is
a last resort because it replaces the whole database and loses writes made
after the snapshot.

## Destructive migration notes

`npm run check:migrations` detects drops, truncation, deletes, type changes,
and renames. For `drizzle/NNNN_name.sql`, add
`drizzle/notes/NNNN_name.md` with these headings:

- `## Risk`: data and mixed-version compatibility at risk.
- `## Roll-forward` or `## Rollback`: an executable recovery choice. Do not
  claim a rollback is safe when only backup restoration can recover the data.
- `## Verification`: queries or observable checks that prove completion.

The repository quality check runs this validator. Review the SQL and its note
before the production command; the validator cannot prove operational safety.
