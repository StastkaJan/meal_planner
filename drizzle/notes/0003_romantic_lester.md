# Week-aware slot key

## Risk

Replacing the primary key can leave slot uniqueness unenforced if the migration
stops between statements. This migration predates the recovery-note policy.

## Roll-forward

Inspect the table constraints, then add the new four-column primary key if it
is absent. Keep application versions that write the `week` column deployed.

## Verification

Confirm the new primary key exists and no duplicate plan/week/day/type rows exist.
