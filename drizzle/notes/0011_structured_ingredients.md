# Structured ingredients

## Risk

Dropping `meals.ingredients` removes the legacy ingredient text. Old application
versions cannot read ingredients afterward. This migration predates the
recovery-note policy.

## Roll-forward

Keep the structured-ingredient application deployed. Exact recovery of legacy
text is only possible if a pre-migration backup was retained; otherwise it can
only be approximated from `meal_ingredients` and `ingredients`.

## Verification

Compare ingredient counts for representative meals and load their recipe and
shopping-list views.
