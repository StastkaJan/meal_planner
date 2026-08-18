# Date-based slots

## Risk

The migration removes `week` and `day_of_week` after deriving `date`; old
application versions cannot operate afterward. This migration predates the
recovery-note policy.

## Roll-forward

Deploy the date-based application and verify every slot has a date. Exact
recovery of the removed source columns is only possible if a pre-migration
database backup was retained.

## Verification

Confirm `date` is non-null, the new primary key exists, and plan slots load for
known weeks.
