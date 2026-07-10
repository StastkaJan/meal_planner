# Business Case: Recipe Library

_One structured place for every meal — the building blocks the calendar plans with._

## Problem

Meal planning is only as good as the meals you can choose from. Recipes
scattered across bookmarks, screenshots, and memory can't be searched, can't be
compared on nutrition, and can't be reused by a planner. Without a structured
library, every plan starts from nothing.

## Solution

A shared library of meals, each stored as a full recipe: name, image, cook time,
difficulty, calories and macros, cuisine/diet tags, description, ingredients,
and instructions. Browse them in a list, open one for the full detail view, and
edit every field inline. In this app a **meal _is_ a recipe** — the same record
powers both.

## Who it's for

Whoever curates the meals: the cook building their private repertoire, or an
admin seeding the shared library everyone plans from. Each meal is either
**global** (shared with everyone) or **personal** (visible only to its owner) —
chosen when the meal is created.

## Value

- **Structured, reusable meals** — captured once, usable in any plan, any week.
- **Rich recipe detail** — hero image, ingredients, step instructions, cook time
  and difficulty make each entry actually cookable, not just a name.
- **Nutrition on every meal** — calories and macros are first-class, which is
  what lets the calendar budget a day and hit targets.
- **Tags drive automation** — cuisine and dietary tags are how auto-compose
  knows an entry is Italian, vegan, or gluten-free.
- **Fast editing** — inline create and full-field edit, no separate admin tool.

## How it works

`/meals` lists the library (name, difficulty, time) with inline add, delete, and
**Import from URL** (parses a recipe page's schema.org JSON-LD into a personal
draft you then review on its detail page).
`/meals/[id]` renders the full recipe, showing only the fields that are filled,
and swaps to an edit form covering every field — numeric macros, tag chips,
and multi-line ingredients/instructions. These meal records are exactly what the
[meal calendar](./meal-calendar.md) assigns to slots and filters during
auto-compose. Meal writes require login. On create you choose the meal's scope:
**global** (shared, and — like the seeded library — communally editable by any
logged-in user) or **personal** (only you can see or edit it). The calendar and
auto-compose only ever offer a user their visible set (global + own).

See [../schema.md](../schema.md) (`meals`) and [../api.md](../api.md)
(`/meals/*`) for the fields and endpoints.

## Success signals

- Library size and share of meals with complete recipe fields (image,
  ingredients, instructions, macros).
- Tag coverage — untagged meals weaken auto-compose filtering.
- How often library meals actually get assigned to plan slots.

## Non-goals

- No edit history or audit; the current values are the only version.
- No image hosting — `imageUrl` points at an external image, nothing is uploaded.

## Known limitations

- **Global meals are communally editable** — any logged-in user can edit or delete a global
  meal (personal meals are owner-only). No admin/owner distinction on the shared library.
- **Shared tag space** — cuisine and diet still share one tag column. `Vegetarian`/`Vegan`
  now live in the diet list (AND-match) rather than cuisines (OR-match), but nothing stops
  a meal from carrying a cuisine tag in the diet slot or vice versa.

## Future opportunities

- **Favorite/duplicate global → personal**, so a user can fork a shared recipe to tweak.
- **Richer import** — the current importer reads schema.org JSON-LD only; sites without it
  (or with just microdata/plain HTML) fall back to a manual entry.
- **Ingredient-quantity scaling** — the detail view already rescales nutrition by a
  servings stepper; scaling the free-text ingredient amounts is the harder next step.
