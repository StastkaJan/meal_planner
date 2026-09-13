# Expanded ingredient catalogue

Migration 0028 adds everyday English/Czech ingredient names and aliases. Existing exact-name ingredient IDs are reused and become catalogue entries; existing translations and aliases are preserved. It does not rewrite recipe assignments or pantry selections.

## Verification

Check both locale rows for new catalogue entries, preservation of existing edited translations, and catalogue search by Czech/English aliases. Reapplying the data SQL must not duplicate entries or overwrite administrator edits.

## Rollback

The previous app accepts the added data. Roll back app code without deleting catalogue rows, which may already be referenced by recipes or pantry selections.
