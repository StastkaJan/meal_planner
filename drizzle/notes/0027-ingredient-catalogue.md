# Ingredient catalogue rollout

Migration 0027 adds catalogue metadata, personal catalogue links, recipe original wording, and pantry ingredient IDs. It seeds a Czech/English starter catalogue and remaps only unique exact normalized aliases. Unknown names remain usable. No old ingredient rows, recipe wording, or pantry text are removed.

It also adds `ingredient_translations` keyed by `(ingredient_id, locale)`, with normalized-name and alias indexes. Czech labels are copied to `cs`; legacy mixed-language aliases are normalized under `und` (undetermined). New translations and normalized aliases belong to their actual locale; missing labels fall back to the original name.

This is the PR's single migration, replacing its former 0027 and 0028. Its journal timestamp retains the former 0028 timestamp: fresh databases run both guarded stages, previews with only the former 0027 run the translations stage, and previews with both skip it. Guards preserve existing catalogue edits and pantry selections. Drizzle applies both stages transactionally; interrupted migrations can retry.

Rollback: deploy the previous application image while retaining these additive columns/tables. New pantry writes also maintain legacy text. Old application versions remain schema-compatible; they display canonical names for remapped recipes. After any rollback writes, rerun the normalization/backfill statements before returning to ID-based exclusions. Do not drop the added columns or personal links: they contain new selections.

Legacy `name_cs` and `aliases` remain for rollback to earlier PR builds. New locale rows are not mirrored into those columns and are visible only to the new app. Retain the translations table during app rollback so new translations survive redeployment.

Verify recipes retain ordered original names, pantry IDs resolve to the same canonical ingredients as recipe rows, private options appear only for their owner, and grams/kilograms combine without merging mass and volume. Account deletion retains shared/catalogue ingredients and removes private identities only when no user or recipe references remain.
