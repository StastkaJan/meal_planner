# Business Case: Recipe Library

*One structured place for every meal — the building blocks the calendar plans with.*

## Problem

Meal planning is only as good as the meals you can choose from. Recipes
scattered across bookmarks, screenshots, and memory can't be searched, can't be
compared on nutrition, and can't be reused by a planner. Without a structured
library, every plan starts from nothing.

## Solution

A shared library of meals, each stored as a full recipe: name, image, cook time,
difficulty, calories and macros, cuisine/diet tags, description, ingredients,
and instructions. Browse them in a list, open one for the full detail view, and
edit every field inline. In this app a **meal *is* a recipe** — the same record
powers both.

## Who it's for

Whoever curates the meals: the cook building their repertoire, or an admin
seeding the library everyone plans from. The library is global, not per-user.

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

`/meals` lists the library (name, difficulty, time) with inline add and delete.
`/meals/[id]` renders the full recipe, showing only the fields that are filled,
and swaps to an edit form covering every field — numeric macros, tag chips,
and multi-line ingredients/instructions. These meal records are exactly what the
[meal calendar](./meal-calendar.md) assigns to slots and filters during
auto-compose.

See [../schema.md](../schema.md) (`meals`) and [../api.md](../api.md)
(`/meals/*`) for the fields and endpoints.

## Success signals

- Library size and share of meals with complete recipe fields (image,
  ingredients, instructions, macros).
- Tag coverage — untagged meals weaken auto-compose filtering.
- How often library meals actually get assigned to plan slots.

## Future opportunities

- **Recipe import** from a URL or paste, to grow the library without manual entry.
- **Per-user or favorite meals**, so the shared library isn't the only source.
- **Servings / scaling** on ingredients and nutrition.
