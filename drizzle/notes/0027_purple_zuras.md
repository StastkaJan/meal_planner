# Ingredient alias reconciliation

## Risk

Migration 0027 remaps unambiguous legacy aliases and normalized original-name duplicates after loading the full catalogue. This includes custom recipe/pantry names differing only in case or whitespace. It replaces personal links with their canonical equivalent before deleting redundant links and demotes old catalogue rows. Ambiguous aliases and multiple managed identities remain separate. Original ingredient rows, recipe wording, pantry text, and translations are retained.

## Rollback

The previous app remains compatible with the additive schema and canonical links. An exact reversal of ingredient IDs and removed personal links requires restoring the pre-deploy backup; an app rollback alone does not reverse reconciliation. After legacy app writes, rerun the backfill before returning to ID-based exclusions. See [rollout details](0027-ingredient-catalogue.md).

## Verification

Run `npm run test:unit -- scripts/ingredient-migration.test.ts`. Real PostgreSQL SQL via PGlite covers fresh databases and each earlier preview stage: English/Czech aliases converge for recipe, pantry, and picker links; unknown ingredients, original wording, ambiguous matches, and managed translations survive; reapplication is idempotent.
