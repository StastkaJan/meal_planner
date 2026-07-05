# API Routes

| Method | Path                    | Auth | Purpose                        |
|--------|-------------------------|------|---------------------------------|
| GET    | /meals                  | no   | list meals                      |
| POST   | /meals                  | no   | create meal                     |
| PATCH  | /meals/[id]             | no   | update meal                     |
| DELETE | /meals/[id]             | no   | delete meal                     |
| POST   | /meals/[id]?/update     | no   | update recipe fields + tags (form action) |
| POST   | /meals/[id]?/delete     | no   | delete meal (form action)       |
| GET    | /plans                  | yes  | list user plans                 |
| POST   | /plans                  | yes  | create plan                     |
| GET    | /plans/[id]             | yes  | get plan + week slots (`?week=` optional, defaults to plan's weekStart) |
| PATCH  | /plans/[id]             | yes  | update plan                     |
| DELETE | /plans/[id]             | yes  | delete plan                     |
| PUT    | /plans/[id]/slots       | yes  | upsert/clear one slot (`{week, dayOfWeek, mealType, mealId}`) |
| POST   | /plans/[id]/autocompose | yes  | auto-fill empty week slots      |
| POST   | /auth/register          | no   | create account (form action)    |
| POST   | /auth/login             | no   | start session (form action)     |
| POST   | /auth/logout            | yes  | end session                     |
