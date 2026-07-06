# API Routes

| Method | Path                    | Auth | Purpose                        |
|--------|-------------------------|------|---------------------------------|
| GET    | /meals                  | no   | list meals                      |
| POST   | /meals                  | no   | create meal                     |
| PATCH  | /meals/[id]             | no   | update meal                     |
| DELETE | /meals/[id]             | no   | delete meal                     |
| POST   | /meals/[id]?/update     | no   | update recipe fields + tags (form action) |
| POST   | /meals/[id]?/delete     | no   | delete meal (form action)       |
| POST   | /meals?/create          | no   | create meal (form action, used by meals list page) |
| POST   | /meals?/delete          | no   | delete meal (form action, used by meals list page) |
| GET    | /plans                  | yes  | list user plans                 |
| POST   | /plans                  | yes  | create plan                     |
| GET    | /plans/[id]             | yes  | get plan + week slots (`?week=` optional, defaults to plan's weekStart) |
| PATCH  | /plans/[id]             | yes  | update plan                     |
| DELETE | /plans/[id]             | yes  | delete plan                     |
| PUT    | /plans/[id]/slots       | yes  | upsert/clear one slot (`{week, dayOfWeek, mealType, mealId}`) |
| POST   | /plans/[id]/autocompose | yes  | auto-fill empty week slots      |
| POST   | /?/createPlan           | yes  | create plan, redirects to `/?plan=&week=` (form action, used by home page) |
| POST   | /?/deletePlan           | yes  | delete plan (form action, used by home page) |
| POST   | /?/slotChange           | yes  | upsert/clear one slot (form action, used by home page) |
| POST   | /?/autocompose          | yes  | auto-fill empty week slots (form action, used by home page) |
| POST   | /?/settingsChange       | yes  | update plan cuisine/diet prefs (form action, used by home page) |
| POST   | /auth/register          | no   | create account (form action)    |
| POST   | /auth/login             | no   | start session (form action)     |
| POST   | /auth/logout            | yes  | end session                     |

> Note: the `/plans*` and `/meals` REST endpoints above still exist as the documented public API, but the frontend (`/` and `/meals` pages) drives its own mutations through the form actions instead, sharing logic via `src/lib/server/plans.ts`.
