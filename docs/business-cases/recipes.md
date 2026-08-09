# Business Case: Recipe Library

_One structured place for every meal — the building blocks the calendar plans with._

## Problem

Meal planning is only as useful as the meals available to choose from. Recipes
scattered across bookmarks, screenshots, and memory cannot be compared,
filtered, or reused reliably. Without a structured library, every plan starts
from scratch.

## Solution

A library where a meal can start with only a name and grow into a complete
recipe with an image, cooking time, difficulty, nutrition, tags, serving count,
ingredients, and instructions. The same record powers both the recipe detail
and the meal calendar: in this app, a **meal is a recipe**.

## Who it's for

Home cooks building a private repertoire and maintainers seeding a shared
library. Each meal is created as either **global** (shared with everyone) or
**personal** (visible only to its owner).

## Value

- **Structured, reusable meals** — captured once, usable in any plan, any week.
- **Optional recipe detail** — images, ingredients, instructions, cooking time,
  and difficulty turn a simple meal into a cookable recipe.
- **First-class nutrition fields** give the calendar the data it needs to plan
  against calorie and macro targets.
- **Tags and allowed meal types** help auto-compose choose suitable recipes for
  each plan and slot.
- **Personal and shared scopes** support private collections and a common
  library without a separate administration tool.
- **Favourites and URL import** make useful meals faster to find and capture.

## How it works

- **Browse and organise.** `/meals` lists each visible meal with its name,
  difficulty, and cooking time. Users can add a meal, delete one they can edit,
  filter to favourites, or toggle a per-user favourite without copying the
  recipe.
- **View and edit.** `/meals/[id]` shows only populated fields and can switch to
  a full edit form. The form covers nutrition, serving count, cuisine and
  dietary tags, allowed meal types, structured ingredient rows
  (`name`/`qty`/`unit`), instructions, and presentation details. The serving
  stepper rescales displayed nutrition for the chosen number of servings.
- **Import from a URL.** The importer reads schema.org Recipe JSON-LD,
  microdata, or common recipe HTML markup and saves the recognised fields as a
  personal meal for review. Common leading quantities and units are split into
  structured ingredient fields; ambiguous lines are preserved unchanged and
  marked as unable to scale until manually edited.
- **Apply visibility rules.** Global meals are visible and communally editable
  by every logged-in user. Personal meals are visible and editable only by
  their owner. The [meal calendar](./meal-calendar.md) and auto-compose use the
  same visible set: global meals plus the user's own personal meals.

See [../schema.md](../schema.md) (`meals`, `ingredients`, `mealIngredients`)
and [../api.md](../api.md) (`/meals/*`) for the fields and endpoints.

## Success signals

- Library size and share of meals with complete recipe fields (image,
  ingredients, instructions, macros).
- Tag coverage — untagged meals weaken auto-compose filtering.
- How often library meals actually get assigned to plan slots.

## Non-goals

- No edit history or audit; the current values are the only version.
- No image hosting — `imageUrl` points at an external image, nothing is uploaded.

## Known limitations

- **Global meals are communally editable** — any logged-in user can edit or
  delete a global meal. There is no admin or owner distinction for the shared
  library.
- **Cuisine and diet share one tag field** — the UI separates the choices, but
  the database does not prevent a cuisine tag from being used as a diet tag or
  vice versa. `allowedSlots` is separate and acts as a hard restriction.

## Future opportunities

- **Ingredient-quantity scaling** alongside the nutrition serving stepper.
