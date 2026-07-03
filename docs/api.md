# API Routes

| Method | Path                    | Auth | Purpose                   |
|--------|-------------------------|------|---------------------------|
| GET    | /meals                  | yes  | list meals                |
| POST   | /meals                  | yes  | create meal               |
| PATCH  | /meals/[id]             | yes  | update meal               |
| DELETE | /meals/[id]             | yes  | delete meal               |
| GET    | /plans                  | yes  | list user plans           |
| POST   | /plans                  | yes  | create plan               |
| PUT    | /plans/[id]             | yes  | update plan               |
| DELETE | /plans/[id]             | yes  | delete plan               |
| GET    | /plans/[id]/slots       | yes  | get week slot assignments |
| PUT    | /plans/[id]/slots       | yes  | assign meals to slots     |
| POST   | /auth/register          | no   | create account            |
| POST   | /auth/login             | no   | start session             |
| POST   | /auth/logout            | yes  | end session               |
