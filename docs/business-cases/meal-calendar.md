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
  target, so the plan stays balanced without a spreadsheet.

## How it works

Each plan owns a grid of slots keyed by `(plan, week, day, meal type)`; filling
a slot points it at a meal, clearing it removes it. Auto-compose filters the
meal library by the plan's cuisine (any-match) and dietary (all-match)
preferences, then greedily fills empty slots by splitting a 2000-kcal daily
budget across them and picking a meal that fits — with a fallback so a sparse or
untagged library never stalls it. Week and plan live in the URL, so a shared or
bookmarked link reopens the exact view. Plans are per-user and enforced
server-side.

See [../schema.md](../schema.md) (`plans`, `weekSlots`) and
[../api.md](../api.md) (`/plans/*`) for the data and endpoints.

## Success signals

- Share of weeks that reach full slot coverage.
- Auto-compose usage rate, and whether users keep vs. swap its picks.
- Return rate week over week (planning ahead implies coming back).

## Future opportunities

- **Macro-aware auto-compose** — today it budgets calories only
  (`src/lib/server/plans.ts` `autocomposeSlots`); protein/carb/fat targets are
  the obvious next lever.
- **Shopping list** generated from a week's assigned meals.
- **Copy / repeat week** to reuse a good plan instead of rebuilding it.
