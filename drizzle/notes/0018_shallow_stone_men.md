# Cascade recipe submissions on account deletion

## Risk

The foreign key is absent between the two migration statements if the migration
stops early. Once applied, deleting a user also deletes that user's recipe
submissions; existing application versions remain compatible.

## Roll-forward

Reapply the intended constraint if the migration stops after dropping it:

```sql
ALTER TABLE "recipe_imports"
  DROP CONSTRAINT IF EXISTS "recipe_imports_submitted_by_users_id_fk";
ALTER TABLE "recipe_imports"
  ADD CONSTRAINT "recipe_imports_submitted_by_users_id_fk"
  FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
```

## Verification

Confirm `confdeltype` is `c` (cascade) and that no submission references a
missing user:

```sql
SELECT confdeltype
FROM pg_constraint
WHERE conname = 'recipe_imports_submitted_by_users_id_fk';

SELECT count(*)
FROM recipe_imports ri
LEFT JOIN users u ON u.id = ri.submitted_by
WHERE u.id IS NULL;
```
