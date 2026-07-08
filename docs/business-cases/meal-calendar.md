# Business Case: Meal Calendar

*Plan a whole week of meals in minutes — or let the app plan it for you.*

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
  target, so the plan stays balanced without a spreadsheet. (The target is one
  global constant today — 2000 kcal plus fixed macros — not per-user.)

## How it works

Each plan owns a grid of slots keyed by `(plan, week, day, meal type)`; filling
a slot points it at a meal, clearing it removes it. Auto-compose filters the
meal library by the plan's cuisine (any-match) and dietary (all-match)
preferences, then fills empty slots by splitting a 2000-kcal daily budget across
them and picking at random among meals within 1.3× the per-slot budget — with a
fallback so a sparse or untagged library never stalls it. It tracks the meals
already placed that week (including ones already in the plan) and prefers unused
ones, so a large enough library yields a distinct meal per slot. A **Copy from
last week** action clones the previous week's slots into the current one
(overwriting it) to reuse a good plan. Week and plan
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

- **Calories-only** — auto-compose budgets calories and de-dups within the week,
  but ignores macros (`src/lib/server/plans.ts` `autocomposeSlots`).
- **Global nutrition target** — the same 2000 kcal / fixed macros apply to every
  user and plan; no personalization by body, activity, or goal.

## Future opportunities

- **Personalized nutrition targets** — per user/goal instead of the global
  constant, which also makes the live feedback meaningful.
- **Macro-aware auto-compose** — today it budgets calories only; protein/carb/fat
  targets are the obvious next lever.
- **Shopping list** generated from a week's assigned meals.
