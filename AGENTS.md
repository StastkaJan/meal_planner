# AGENTS.md

> Auto-update rule: after any session that adds routes, tables, auth changes, or infra changes — update the relevant section. If something here is wrong or stale, fix it in the same PR. Keep it short; code is the source of truth.

## Stack

- **Frontend**: SvelteKit 5, Svelte 5, Vite 6, Sass
- **Backend**: Node.js adapter (SvelteKit API routes)
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based, scrypt hashed passwords, 30-day expiry cookie
- **Tests**: Vitest (unit), Playwright (E2E)
- **Infra**: Docker Compose (app + postgres)

## Project layout

```
src/
  lib/          # db client, schema, auth helpers, shared components
  routes/       # pages + API endpoints (colocated)
drizzle/        # migrations (0000_*, 0001_*)
tests/          # Playwright E2E
docker-compose.yml
```

## DB schema & API routes

See [docs/schema.md](docs/schema.md) and [docs/api.md](docs/api.md).

## Auth flow

1. Register/login → server creates `sessions` row, sets `session` cookie (httpOnly)
2. `src/hooks.server.ts` validates cookie on every request, attaches user to `event.locals`
3. Slot ownership enforced server-side: plan must belong to `locals.user`

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
