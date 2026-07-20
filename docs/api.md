# API Routes

| Method | Path                    | Auth | Purpose                                                                                                                      |
| ------ | ----------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET    | /meals                  | no   | list visible meals (global + own when signed in)                                                                             |
| POST   | /meals                  | yes  | create meal (`scope: personal\|global`, default global)                                                                      |
| PATCH  | /meals/[id]             | yes  | update meal                                                                                                                  |
| DELETE | /meals/[id]             | yes  | delete meal                                                                                                                  |
| PUT    | /meals/[id]/favorite    | yes  | set/clear the caller's favourite on a meal (`{favorite: boolean}`)                                                           |
| POST   | /meals/import           | yes  | parse a recipe from `{url}` or `{text}` (schema.org JSON-LD) → fields, no insert                                             |
| GET    | /plans                  | yes  | list user plans                                                                                                              |
| POST   | /plans                  | yes  | create plan                                                                                                                  |
| GET    | /plans/[id]             | yes  | get plan + week slots (`?week=` optional, defaults to plan's weekStart)                                                      |
| PATCH  | /plans/[id]             | yes  | update plan                                                                                                                  |
| DELETE | /plans/[id]             | yes  | delete plan                                                                                                                  |
| PUT    | /plans/[id]/slots       | yes  | upsert/clear one slot (`{date, mealType, mealId}`); 400 if the meal's `allowedSlots` excludes `mealType`                     |
| POST   | /plans/[id]/autocompose | yes  | auto-fill empty week slots (`{week?, favoritesOnly?}` — favoritesOnly restricts candidates to the caller's favourited meals) |
| POST   | /plans/[id]/copy-week   | yes  | copy one week's slots to another (`{from, to}`)                                                                              |
| PATCH  | /profile                | yes  | upsert cuisine/dietary defaults (`{cuisinePrefs?, dietaryRestrictions?}`); nutrition targets use the `?/targets` form action |
| POST   | /auth/register          | no   | create account (form action)                                                                                                 |
| POST   | /auth/login             | no   | start session (form action)                                                                                                  |
| POST   | /auth/logout            | yes  | end session                                                                                                                  |
