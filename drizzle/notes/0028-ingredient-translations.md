# Ingredient translations

Apply 0028 before deploying the locale-based ingredient catalogue. It adds
`ingredient_translations` keyed by `(ingredient_id, locale)` and indexes for
normalized names and aliases. Existing IDs, recipe wording, pantry selections,
and private ownership links are unchanged. Czech labels are copied to `cs`;
legacy mixed-language aliases are normalized and retained under `und` (undetermined).
New translations and normalized aliases belong to their actual locale.

The legacy `name_cs` and `aliases` columns remain for app rollback. Old app
versions can still read their bilingual data and create fallback-only ingredients;
new code resolves those names without translation rows. New locale rows are not
mirrored into legacy columns, so changes made there after this migration are only
visible to the new app. Roll back the app without reversing the migration; retain
the new table so those translations survive redeployment. No destructive step.
