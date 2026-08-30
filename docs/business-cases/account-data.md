# Business Case: Account Data Control

_Users can take their data with them and permanently leave the service._

## Problem

Private recipes and meal plans should not be trapped in the application, and
closing an account must remove its sessions and personal records reliably.

## Solution

The profile provides a machine-readable JSON download containing the signed-in
user's account email, settings, personal recipes and ingredients, plans and
their calendar data, favourites, recipe submissions, and legal-document events. It excludes password
hashes, session tokens, admin state, global recipes, and every other user's data.

Permanent deletion requires both the current password and the exact account
email. One database transaction deletes the user; foreign-key cascades remove
sessions, settings, personal recipes, plans, favourites, submissions, and their
dependent rows. Global catalogue recipes remain independent and are preserved.
The final administrator must promote another user before deleting their account.

## Non-goals

- The export is JSON only; there is no PDF or import workflow.
- Shared canonical ingredient names remain when an account is deleted because
  they contain no account ownership and may be used by other recipes.
