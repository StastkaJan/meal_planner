# AGENTS.md

> Maintenance: update relevant documentation when routes, tables, auth, or infrastructure change. Keep this file focused on working rules and non-obvious constraints; code is the source of truth.

> Commits: do not add Claude/AI co-author or "Generated with" trailers to commits or PRs.

> Before every commit, run `npm run check` and fix any failures.

> Migrations: keep exactly one migration per PR that changes the database; consolidate its SQL, journal entry, and snapshot before merging. Preserve compatibility with previews that applied earlier PR revisions.

## Stack

- **Frontend**: SvelteKit 2, Svelte 5, Vite 8, Sass
- **Backend**: Node.js adapter (SvelteKit API routes)
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based, scrypt hashed passwords, 30-day expiry cookie
- **Tests**: Vitest (unit), Playwright (E2E)
- **Infra**: Docker Compose (app + postgres + Prometheus/Alertmanager/Loki/Alloy/Grafana)

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

## Reference documentation

Read the relevant section of [implementation notes](docs/implementation-notes.md) when working on [tooling and CI](docs/implementation-notes.md#tooling-and-ci), [deployment and backups](docs/implementation-notes.md#deployment-and-backups), [observability](docs/implementation-notes.md#observability), [accounts and access](docs/implementation-notes.md#accounts-access-and-legal-documents), [planner and nutrition](docs/implementation-notes.md#planner-and-nutrition), or [recipes and ingredients](docs/implementation-notes.md#recipes-ingredients-and-localization).

## DB schema & API routes

Recipe editing and translation use `/meals/[id]/edit` and `/meals/[id]/translate`; both require recipe edit access.

See [docs/schema.md](docs/schema.md) and [docs/api.md](docs/api.md).

Feature business cases (the _why_): [docs/business-cases/meal-calendar.md](docs/business-cases/meal-calendar.md), [docs/business-cases/recipes.md](docs/business-cases/recipes.md), [docs/business-cases/account-data.md](docs/business-cases/account-data.md).

## Svelte conventions

- Fetch page data via `load` in `+page.server.ts`/`+layout.server.ts` through server services/repositories, not `onMount`/`$effect` in components. Consume it via `let { data }: { data: PageData } = $props()`.
- Keep reusable controls in `$lib/components/ui`; colocate feature components under the owning route's `_components/`.
- Browser mutations go through `$lib/api`; server routes use guards/services, and only repositories import `db`.
- Prefer filtering, joins, and aggregation in repository SQL when doing so reduces rows or data transferred; keep TypeScript filtering for domain logic that SQL cannot express clearly.
- Plan `portions` is the number of people served; shopping quantities scale by `portions / meal.servings`.
- Pantry exclusions use `pantryIngredientIds`; legacy `pantryStaples` names are written for rollback and used only when no IDs are selected.
- Interactive state that should survive navigation/reload belongs in the URL (`?param=`) so `load` reruns automatically — don't shadow it in component `$state`.
- This project does **not** use `invalidate`/`invalidateAll` and does **not** use `use:enhance`. All mutations use `fetch()` against the REST endpoints (`src/routes/**/+server.ts`), then update local state directly: for an in-place edit, derive a writable copy of load data with `$derived` (e.g. `let plan = $derived(data.plan)`) and reassign it after the `fetch` (see `handleSlotChange`/`handleSettingsChange` in `src/routes/+page.svelte`); for a create/delete that changes which rows exist, `goto()` the new/`/` URL to re-run `load` (see `createPlan` in `src/routes/+page.svelte`). If a REST endpoint doesn't exist yet for a form, add one in `+server.ts` — don't use form actions.
- Note: `goto()` to the same route doesn't remount the component, so local `$state` for "is this form open" (e.g. `creating`) must be reset explicitly in the handler — see `createPlan` in `src/routes/+page.svelte`.
- Prefer `$derived`/`$derived.by` over `$effect`; reassigning a `$derived` value (Svelte 5.25+) is the idiomatic way to derive local editable state from a prop instead of `$effect`-syncing it into `$state`.
- Refs: [svelte.dev/docs/kit/load](https://svelte.dev/docs/kit/load), [svelte.dev/docs/svelte/best-practices](https://svelte.dev/docs/svelte/best-practices).

## Auth flow

<!-- NOTE: `/auth/forgot-password` and `/auth/reset-password` use JSON POST endpoints. `password_resets` keeps one 30-minute hashed token per account, tied to the current password; redemption atomically consumes it and revokes sessions. Email uses SMTP2GO over TLS (`SMTP2GO_USERNAME`, `SMTP2GO_PASSWORD`, bare verified-domain address `EMAIL_FROM`, trusted `ORIGIN`); the display name is Papu Plan; background delivery failures appear as `auth/request_password_reset` service errors. -->

1. Registration requires terms acceptance and privacy acknowledgement, records both current document versions with the new user, then creates the session. Register/login → `createSession()` creates a `sessions` row and sets the httpOnly cookie. Login uses a constant-time dummy hash when the user is absent.
2. `src/hooks.server.ts` validates cookie on every request, attaches user to `event.locals`
3. Ownership is enforced by `src/lib/server/guards.ts`; persistence checks live in aggregate repositories.
4. Rate-limited login/register: 10 attempts per 15 min per IP (in-memory, single-instance)
5. Admins come from `users.isAdmin`; only admins create/edit global meals and review `/admin/recipes` imports.
6. Account deletion verifies the current password and exact email, deletes the user in one transaction (FK cascades remove personal data and sessions), then clears the cookie.

## Common commands

```bash
npm run dev           # start dev server
npm run db:generate   # drizzle-kit generate (after schema changes)
npm run db:migrate    # apply migrations
npm run check:migrations # validate destructive migration recovery notes
npm run db:seed       # seed dummy data
npm run test          # playwright E2E (needs docker compose up)
npm run test:smoke    # focused Chromium E2E release smoke tests
npm run test:unit     # vitest unit tests
npm run check:types   # Svelte and TypeScript checks
npm run format:check  # verify formatting without writing
docker compose up -d  # start postgres + app
```

## Testing notes

- E2E: single Chrome worker, no retries, app at `http://localhost:3000`
- DB resets between test runs via seed script
- Unit tests colocated with their subject (`*.test.ts` next to the file under test); Vitest picks them up via `vite.config.ts` and excludes nested `.worktrees/`

## Testing rules

- After every new feature or API change, write or update the corresponding Vitest unit test (colocated next to the file under test) or Playwright E2E test (in `tests/`).
- Unit tests for pure logic; E2E for user-facing flows.
- Run `npm run test:unit` before declaring a feature done.

## Maintaining this file

- Add an instruction only when it prevents a likely mistake that code or existing documentation does not make obvious.
- Put feature, route, schema, and infrastructure details in the relevant `docs/` file; use [implementation notes](docs/implementation-notes.md) for cross-cutting details.
- Remove stale entries and keep prose minimal. Link to documentation instead of duplicating it.
