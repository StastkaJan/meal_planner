# AGENTS.md

> Auto-update rule: after any session that adds routes, tables, auth changes, or infra changes — update the relevant section. If something here is wrong or stale, fix it in the same PR. Keep it short; code is the source of truth.

> Commits: do not add Claude/AI co-author or "Generated with" trailers to commits or PRs.

## Stack

- **Frontend**: SvelteKit 5, Svelte 5, Vite 6, Sass
- **Backend**: Node.js adapter (SvelteKit API routes)
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based, scrypt hashed passwords, 30-day expiry cookie
- **Tests**: Vitest (unit), Playwright (E2E)
- **Infra**: Docker Compose (app + postgres + Prometheus/Loki/Alloy/Grafana)

<!-- NOTE: HTTP and service operations emit correlated JSON logs; `/health` checks PostgreSQL and `/metrics` feeds Grafana at :3001. Alloy ships all Docker logs to Loki. -->

<!-- NOTE: Browser runtime failures post to `/client-errors`, increment `client_errors_total`, and log to Loki as `client_error`. -->

<!-- NOTE: Dockerfile bundles database/seed.ts and normalizes entrypoint.sh line endings for Windows checkouts. -->

<!-- NOTE: The `production` Compose profile runs encrypted daily PostgreSQL backups to a configured Restic repository and can notify a failure webhook. -->

<!-- NOTE: Dependabot proposes weekly npm, Docker, and Actions updates; `Dependency security` audits the lockfile and scans the built application image. -->

<!-- NOTE: Set `users.is_admin=true` to grant global recipe import/review/edit access. -->

## Project layout

```
src/
  lib/
    api/                 # browser-side REST clients
    components/ui/       # reusable native-control primitives
    database/
      schema/            # one Drizzle table per file
      index.ts           # database client
      seed.ts
    domain/              # pure shared business logic
    server/
      repositories/      # Drizzle persistence by aggregate
      services/          # application operations
      guards.ts          # request auth/ownership guards
    utils/               # shared technical helpers
  routes/                # pages, API endpoints, and route-local _components/
drizzle/        # migrations
tests/          # Playwright E2E
docker-compose.yml
```

## DB schema & API routes

See [docs/schema.md](docs/schema.md) and [docs/api.md](docs/api.md).

Feature business cases (the _why_): [docs/business-cases/meal-calendar.md](docs/business-cases/meal-calendar.md), [docs/business-cases/recipes.md](docs/business-cases/recipes.md).

## Svelte conventions

- Fetch page data via `load` in `+page.server.ts`/`+layout.server.ts` through server services/repositories, not `onMount`/`$effect` in components. Consume it via `let { data }: { data: PageData } = $props()`.
- Keep reusable controls in `$lib/components/ui`; colocate feature components under the owning route's `_components/`.
- Browser mutations go through `$lib/api`; server routes use guards/services, and only repositories import `db`.
- Plan `portions` is the number of people served; shopping quantities scale by `portions / meal.servings`.
- Interactive state that should survive navigation/reload belongs in the URL (`?param=`) so `load` reruns automatically — don't shadow it in component `$state`.
- This project does **not** use `invalidate`/`invalidateAll` and does **not** use `use:enhance`. All mutations use `fetch()` against the REST endpoints (`src/routes/**/+server.ts`), then update local state directly: for an in-place edit, derive a writable copy of load data with `$derived` (e.g. `let plan = $derived(data.plan)`) and reassign it after the `fetch` (see `handleSlotChange`/`handleSettingsChange` in `src/routes/+page.svelte`); for a create/delete that changes which rows exist, `goto()` the new/`/` URL to re-run `load` (see `createPlan`/`deletePlan` in `src/routes/+page.svelte`). If a REST endpoint doesn't exist yet for a form, add one in `+server.ts` — don't use form actions.
- Note: `goto()` to the same route doesn't remount the component, so local `$state` for "is this form open" (e.g. `creating`) must be reset explicitly in the handler — see `createPlan` in `src/routes/+page.svelte`.
- Prefer `$derived`/`$derived.by` over `$effect`; reassigning a `$derived` value (Svelte 5.25+) is the idiomatic way to derive local editable state from a prop instead of `$effect`-syncing it into `$state`.
- Refs: [svelte.dev/docs/kit/load](https://svelte.dev/docs/kit/load), [svelte.dev/docs/svelte/best-practices](https://svelte.dev/docs/svelte/best-practices).

## Auth flow

1. Registration requires terms acceptance and privacy acknowledgement before account creation. Register/login → `createSession()` creates a `sessions` row and sets the httpOnly cookie. Login uses a constant-time dummy hash when the user is absent.
2. `src/hooks.server.ts` validates cookie on every request, attaches user to `event.locals`
3. Ownership is enforced by `src/lib/server/guards.ts`; persistence checks live in aggregate repositories.
4. Rate-limited login/register: 10 attempts per 15 min per IP (in-memory, single-instance)
5. Admins come from `users.isAdmin`; only admins create/edit global meals and review `/admin/recipes` imports.

## Common commands

```bash
npm run dev           # start dev server
npm run db:generate   # drizzle-kit generate (after schema changes)
npm run db:migrate    # apply migrations
npm run db:seed       # seed dummy data
npm run test          # playwright E2E (needs docker compose up)
npm run test:unit     # vitest unit tests
docker compose up -d  # start postgres + app
```

## Testing notes

- E2E: single Chrome worker, no retries, app at `http://localhost:3000`
- DB resets between test runs via seed script
- Unit tests colocated with their subject (`*.test.ts` next to the file under test); vitest picks them up via `vite.config.ts`

## Testing rules

- After every new feature or API change, write or update the corresponding Vitest unit test (colocated next to the file under test) or Playwright E2E test (in `tests/`).
- Unit tests for pure logic; E2E for user-facing flows.
- Run `npm run test:unit` before declaring a feature done.

## Self-improvement instructions

When updating this file:

1. **Add** new routes/tables immediately when created — one-liner per row is enough.
2. **Remove** stale entries — a wrong AGENTS.md is worse than a short one.
3. **Keep prose minimal** — if the code explains it, don't repeat it here.
4. **Flag** anything that surprised you with a `<!-- NOTE: ... -->` comment so the next agent sees it.
