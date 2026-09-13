# Ingredient catalogue rollout

Migration 0027 adds catalogue metadata, personal catalogue links, recipe original wording, and pantry ingredient IDs. It seeds a Czech/English starter catalogue and remaps only unique exact normalized aliases. Unknown names remain usable. No old ingredient rows, recipe wording, or pantry text are removed.

It also adds `ingredient_translations` keyed by `(ingredient_id, locale)`, with normalized-name and alias indexes. Czech labels are copied to `cs`; legacy mixed-language aliases are normalized under `und` (undetermined). New translations and normalized aliases belong to their actual locale; missing labels fall back to the original name.

This is the PR's single migration, including the expanded English/Czech catalogue. Its journal timestamp (1789293141321) advances past the former expansion timestamp so earlier previews also run the final alias reconciliation. Fresh databases run all stages; existing previews skip guarded schema/backfill stages and preserve existing translations and aliases. After expansion, unambiguous legacy names without translations are remapped to catalogue IDs in recipes, pantry selections, and personal picker links. Redundant old links are removed and their ingredient rows hidden from the catalogue, retaining original recipe wording, pantry text, and old ingredient rows. Drizzle applies the stages transactionally; retries preserve the resolved state. See [recovery details](0027_purple_zuras.md).

Rollback: deploy the previous application image while retaining these additive columns/tables. New pantry writes also maintain legacy text. Old application versions remain schema-compatible; they display canonical names for remapped recipes. After any rollback writes, rerun the normalization/backfill statements before returning to ID-based exclusions. Do not drop the added columns or personal links: they contain new selections.

Legacy `name_cs` and `aliases` remain for rollback to earlier PR builds. New locale rows are not mirrored into those columns and are visible only to the new app. Retain the translations table during app rollback so new translations survive redeployment.

Verify recipes retain ordered original names, pantry IDs resolve to the same canonical ingredients as recipe rows, private options appear only for their owner, and grams/kilograms combine without merging mass and volume. Account deletion retains shared/catalogue ingredients and removes private identities only when no user or recipe references remain.
