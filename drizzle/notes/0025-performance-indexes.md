# Performance indexes

Migration 0025 adds indexes only; it preserves all rows and remains compatible
with the previous app version. Apply through the normal release migration step.
Standard index creation briefly blocks writes to the indexed tables.

For an app rollback, retain the indexes. If an index must be removed, an operator
can drop `bonus_items_plan_date_idx`, `meal_ingredients_meal_position_idx`, or
`sessions_expires_at_idx` individually without changing account data.

On representative data, compare `EXPLAIN (ANALYZE, BUFFERS)` for recipe ingredient
lookups ordered by position and bonus lookups filtered by plan and date range.
