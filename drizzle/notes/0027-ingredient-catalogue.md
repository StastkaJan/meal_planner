# Ingredient catalogue rollout

Migration 0027 adds catalogue metadata, personal catalogue links, recipe original wording, and pantry ingredient IDs. It seeds a Czech/English starter catalogue and remaps only unique exact normalized aliases. Unknown names remain usable. No old ingredient rows, recipe wording, or pantry text are removed.

Rollback: deploy the previous application image while retaining these additive columns/tables. New pantry writes also maintain legacy text. Old application versions remain schema-compatible; they display canonical names for remapped recipes. After any rollback writes, rerun the normalization/backfill statements before returning to ID-based exclusions. Do not drop the added columns or personal links: they contain new selections.

Verify recipes retain ordered original names, pantry IDs resolve to the same canonical ingredients as recipe rows, private options appear only for their owner, and grams/kilograms combine without merging mass and volume. Account deletion retains shared/catalogue ingredients and removes private identities only when no user or recipe references remain.
