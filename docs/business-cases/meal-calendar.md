# Business Case: Meal Calendar

_Plan a whole week of meals in minutes — or let the app plan it for you._

## Problem

Deciding what to eat is a small chore that repeats several times a day. Plans
kept in memory or on scraps of paper are easy to lose, while choosing from
scratch encourages repetition and makes nutrition harder to balance.

## Solution

A private weekly calendar with five slots per day: breakfast, morning snack,
lunch, afternoon snack, and dinner. Users can assign meals manually, reuse a
previous week, or ask **Auto-compose** to fill empty slots from their recipe
library.

## Who it's for

Home cooks, people tracking calories or macros, and families planning around
different dietary needs. Plans belong to a logged-in user and are private.

## Value

- **One weekly planning session** replaces repeated daily decisions.
- **Auto-compose** provides a calorie- and macro-aware starting point that
  remains easy to edit.
- **One continuous plan** per user keeps every week in one calendar, while
  profile preferences shape what auto-compose picks.
- **Live nutrition feedback** compares each day with profile targets, falling
  back to the app defaults when a target is not set.
- **Repeat patterns and week copying** support batch cooking and familiar
  routines without repetitive data entry.
- **Bonus items, recalculation, and a derived shopping list** keep the plan
  useful when real life differs from the original schedule.

## How it works

- **Plan manually.** Each plan owns one slot per date and meal type. The
  searchable picker only offers visible meals allowed in that slot; an empty
  `allowedSlots` list means the meal can be used anywhere. The selected plan
  and week live in the URL, so a bookmark reopens the same view.
- **Auto-compose empty slots.** Cuisine preferences are any-match and dietary
  restrictions are all-match. When no meal matches those preferences,
  auto-compose falls back to the visible library, but visibility, slot
  restrictions, and **Favourites only** remain hard filters. It ranks calorie
  fit first, macro fit second, and favours meals not already used that week.
  It then jointly refines the week's new assignments to reduce daily nutrition
  misses while preserving repeat groups. Filled slots are never replaced, and
  a slot stays empty when no permitted meal exists.
- **Repeat and reuse.** A weekly repeat pattern partitions Monday through
  Sunday into groups that share a meal for one meal type. Manual changes update
  the whole group, while auto-compose chooses once per group. **Copy from last
  week** applies the previous week's filled slots to the corresponding days,
  replacing assignments in those positions.
- **Track changes to the day.** Bonus items record off-plan food with optional
  calories and macros. They immediately contribute to the day's nutrition
  totals. **Recalculate** fills only the remaining empty slots using the budget
  left after assigned meals and bonus items; an existing meal must be cleared
  before it can be replaced.
- **Build a shopping list.** The weekly shopping view combines structured
  ingredients from assigned meals. It groups matching names and units, sums
  complete quantities, scales them for the plan's people count and each
  recipe's serving count, keeps different units separate, and uses a plain
  count when quantities are missing. Checked and excluded items persist for the
  week; custom items can be added, and active items are grouped into aisles.

See [../schema.md](../schema.md) (`plans`, `weekSlots`, `slotRepeats`,
`bonusItems`, `shoppingItems`) and [../api.md](../api.md) (`/plans/*`) for the data and
endpoints.

## Success signals

- Share of weeks that reach full slot coverage.
- Auto-compose usage and the share of its picks users keep.
- Return rate week over week (planning ahead implies coming back).

## Non-goals

- The shopping list does not track pantry stock.
- The calendar is not an in-kitchen cooking companion; recipe details belong
  in the [recipe library](./recipes.md).
- Auto-compose is a starting point to edit, not a nutritionist's prescription.

## Known limitations

- **Heuristic nutrition fit** — calorie and macro targets guide ranking rather
  than act as guarantees. A limited library can still miss nutrition targets.
