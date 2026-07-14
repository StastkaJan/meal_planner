# Business Case: Meal Calendar

_Plan a whole week of meals in minutes — or let the app plan it for you._

## Problem

Deciding what to eat for every meal, every day, is a small chore that repeats
forever. People fall back on the same handful of dishes, forget to balance
nutrition, and lose the plan the moment it lives in their head or a scrap of
paper. "What's for dinner?" is a daily tax.

## Solution

A weekly calendar where each day has five slots (breakfast, morning snack,
lunch, afternoon snack, dinner). Assign a meal to any slot from a searchable
picker, and page forward/back through weeks. When you don't feel like choosing,
one **Auto-compose** button fills every empty slot for you.

## Who it's for

Anyone who plans meals ahead — home cooks, people tracking calories or macros,
families juggling dietary needs. A logged-in user, since plans are private.

## Value

- **Kills the daily "what's for dinner" decision** — the week is decided once.
- **Auto-compose** removes the blank-page problem: a full, calorie-aware week
  in one click.
- **Multiple plans** per user (e.g. "Family", "Cutting") switch via tabs, so
  different goals or people don't collide.
- **Per-plan preferences** (cuisines you like, diets you follow) shape what
  auto-compose picks.
- **Live nutrition feedback** shows each day's calories and macros against a
  per-user target set on the profile (falling back to a 2000 kcal / fixed-macro
  default), so the plan stays balanced without a spreadsheet.

## How it works

A plan is created in one of two modes, chosen once and fixed thereafter:
**simple mode** (the 5-fixed-slot grid described below) or **calendar
mode**, where meals are placed at any exact hour:minute instead of a named
slot, any number of times per day. Both modes share the same underlying
row shape — calendar mode just stores a time (e.g. `14:30`) where simple
mode stores a slot name. Auto-compose is simple-mode only, since its
calorie-budget split assumes a fixed slot count per day; Copy-from-last-week
and the shopping list work unchanged in both modes.

Each plan owns a grid of slots keyed by `(plan, date, meal type)`; filling
a slot points it at a meal, clearing it removes it. Both the manual picker and
auto-compose only offer meals whose `allowedSlots` includes the slot's meal
type (empty `allowedSlots` = suitable for any slot), so a dinner-only recipe
can't land in breakfast. Auto-compose also filters the
meal library by the plan's cuisine (any-match) and dietary (all-match)
preferences, then fills empty slots by splitting the user's daily calorie target
across them, keeping meals within 1.3× the per-slot calorie budget, and among
those preferring the ones whose protein/carb/fat land closest to the remaining
macro budget — picking at random within the top few so the week stays varied,
with a fallback so a sparse or untagged library never stalls it. It tracks the meals
already placed that week (including ones already in the plan) and prefers unused
ones, so a large enough library yields a distinct meal per slot. A **Copy from
last week** action clones the previous week's slots into the current one
(overwriting it) to reuse a good plan. A **Shopping list** view
(`/plans/[id]/shopping`) flattens every assigned meal's ingredients for the week
into one deduped, checkable list (no quantity math — ingredients are free text). Week and plan
live in the URL, so a shared or
bookmarked link reopens the exact view. Plans are per-user and enforced
server-side.

See [../schema.md](../schema.md) (`plans`, `weekSlots`) and
[../api.md](../api.md) (`/plans/*`) for the data and endpoints.

## Success signals

- Share of weeks that reach full slot coverage.
- Auto-compose usage rate, and whether users keep vs. swap its picks.
- Return rate week over week (planning ahead implies coming back).

## Non-goals

- Not a grocery or pantry-inventory tracker — it plans meals, it doesn't count
  what's in your kitchen.
- Not a cooking companion (no step timers or in-kitchen mode; that's the
  [recipe library](./recipes.md)'s job).
- Auto-compose is a starting point to edit, not a nutritionist's prescription.

## Known limitations

- **Soft macro fit** — auto-compose enforces a hard calorie ceiling but treats
  protein/carb/fat as a ranking preference, not a constraint
  (`src/lib/server/plans.ts` `autocomposeSlots`/`rankByMacros`). A library thin on
  a given macro can still miss the target.

## Future opportunities

- **Whole-week optimization** — auto-compose fills greedily slot by slot; solving
  the week jointly could hit macro targets more tightly.
