# AGENTS.md

> Auto-update rule: after any session that adds routes, tables, auth changes, or infra changes — update the relevant section. If something here is wrong or stale, fix it in the same PR. Keep it short; code is the source of truth.

> Commits: do not add Claude/AI co-author or "Generated with" trailers to commits or PRs.

> Before every commit, run `npm run check` and fix any failures.

## Stack

- **Frontend**: SvelteKit 5, Svelte 5, Vite 6, Sass
- **Backend**: Node.js adapter (SvelteKit API routes)
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based, scrypt hashed passwords, 30-day expiry cookie
- **Tests**: Vitest (unit), Playwright (E2E)
- **Infra**: Docker Compose (app + postgres + Prometheus/Alertmanager/Loki/Alloy/Grafana)

<!-- NOTE: Type checks use TypeScript 7 through the `@typescript/native-preview` npm alias and `svelte-check --tsgo`; TypeScript 6 remains installed for tools that still require its legacy compiler API. -->

<!-- NOTE: Husky's pre-commit hook formats staged files and runs Svelte/TypeScript checks. -->

<!-- NOTE: HTTP and service operations emit allowlisted JSON logs with request ID, route, and `DEPLOYMENT_VERSION`; the bounded version is also exposed by `/health` and `app_release_info`. Server failures retain message-free stack frames and authenticated user ID. `/metrics` feeds Grafana at :3001. Alloy ships all Docker logs to Loki. -->

<!-- NOTE: Use `docs/runbooks/debugging.md` to trace alerts or `x-request-id` values through Grafana metrics and Loki logs. -->

<!-- NOTE: Browser runtime failures post to `/client-errors`, increment `client_errors_total`, and log to Loki as `client_error`. -->

<!-- NOTE: Production containers start only the app. The image bundles the production migration runner for an explicit release step; development seeds are never bundled or run on startup. -->

<!-- NOTE: Production deploys reconcile monitoring service definitions so new mounts and scrape configuration take effect; named volumes preserve monitoring data. -->

<!-- NOTE: The runtime image upgrades Alpine's OpenSSL packages over the digest-pinned Node base before security scanning. -->

<!-- NOTE: The `production` Compose profile runs encrypted daily PostgreSQL and recipe-image backups and verifies restores in a guarded tmpfs database; both failures post to Alertmanager; production deployment also requires `docker-compose.production.yml`. -->

<!-- NOTE: Production serves `papuplan.cz` via `docker-compose.production.yml`: required secrets, an internal Caddy on the shared `public-web` Docker network behind the VPS TLS proxy, private database/monitoring networks, WireGuard-only Grafana and PostgreSQL host ports, and blue/green app slots switched by `scripts/deploy-production.sh`. PostgreSQL also joins the non-internal `admin` network because Docker cannot publish a port from an exclusively internal network. See `docs/production.md` and `docs/wireguard.md`. -->

<!-- NOTE: Dependabot proposes weekly npm, Docker, and Actions updates; `Dependency security` audits the lockfile and scans the built application image. -->

<!-- NOTE: `.github/workflows/quality.yml` defines the release quality check, validates Prometheus capacity rules, explicitly migrates and seeds its test database before smoke tests, and deploys successful `main` pushes to the VPS. A repository admin must configure its hosted `quality` job as a required status check before GitHub enforces it for merges or deployment. -->

<!-- NOTE: Same-repository PRs deploy to isolated `pr-N.papuplan.cz` previews after CI using the existing VPS credentials; first deploy imports production data without session rows, then runs PR migrations. Each preview keeps uploaded recipe images in its own volume. The portfolio Caddy imports generated exact-host routes, and cleanup deletes each preview's containers, image, volumes, route, and secret state when its PR closes. -->

<!-- NOTE: PostgreSQL exporter and cAdvisor feed the Capacity Overview dashboard and `monitoring/capacity-alerts.yml`; thresholds and response steps live in `docs/capacity.md`. -->

<!-- NOTE: Prometheus alerts on sustained 5xx, `/health` failures, latency, and host disk; backup failures post to the same Alertmanager Slack-compatible route, sourced from production `ALERT_WEBHOOK_URL`. -->

<!-- NOTE: `scripts/deploy-production.sh` takes an off-host backup before migrations; destructive SQL requires a recovery note under `drizzle/notes/`, enforced by CI. -->

<!-- NOTE: Backup scheduler restarts do no repository work; backups/restores run daily and retention pruning weekly. A failed pre-deploy backup may be bypassed only when the release migration fingerprint matches the active image; first deploys and migration changes still fail closed. -->

<!-- NOTE: `bash scripts/deploy-production.sh rollback` switches to the inactive slot's retained image; it rolls back app code only, so check migration compatibility first. -->

<!-- NOTE: Set `users.is_admin=true` to grant global recipe import/review/edit access. -->

<!-- NOTE: `/admin/recipes` manages shared recipes and imports; `/admin/users` lets admins grant or revoke admin access for other users. -->

<!-- NOTE: `users.is_pro` is the temporary billing entitlement switch. Pro gates recipe URL import, auto-compose, copy-week, and day recalculation; admins manage it in `/admin/users` until billing owns the flag. -->

<!-- NOTE: `/pricing` is public and explains Free/Pro access; admins manage the temporary `is_pro` entitlement in `/admin/users`. -->

<!-- NOTE: `user_settings.locale` selects the `en`/`cs` app interface and `meal_translations` overlays for recipe name/description/ordered ingredients/instructions; nullable translated fields fall back to the original recipe. -->

<!-- NOTE: The root `+error.svelte` provides localized 404 and server-error UI. -->

<!-- NOTE: `/legal/terms` and `/legal/privacy` are prerendered from the versioned UTF-8 legal Markdown used by registration and account notices. -->

<!-- NOTE: Auth rate limits remain in-process while Compose runs one app instance. Move them to shared storage before scaling out, or after 429s on auth routes persist for three 15-minute windows; Grafana shows the signal without storing IPs. -->

<!-- NOTE: `slot_leftovers` links a later slot to an earlier same-meal slot; linked consumers still count toward nutrition but not shopping ingredients. -->

<!-- NOTE: Meal and bonus nutrition includes calories, macros, fibre, sugars, saturated fat, and salt; the four secondary nutrients are displayed and totaled but do not affect auto-compose targets. -->

<!-- NOTE: Uploaded recipe images are resized to at most 1200x900, converted to WebP, and stored in the shared `recipe-images` volume; `/meals/[id]/image` serves and manages them, and app containers set `BODY_SIZE_LIMIT=6M`. -->

<!-- NOTE: `plans.meal_slots` is the ordered enabled slot list; disabling one transactionally removes its assignments and repeat pattern. -->

<!-- NOTE: `/profile/export` returns only caller-owned account data, including uploaded recipe images and legal-document events; `DELETE /profile` requires the current password plus exact email, preserves global meals, and rejects deletion of the final administrator. -->

<!-- NOTE: `legal_document_events` records each terms acceptance or privacy-notice acknowledgement by user, document, and version; missing current-version rows drive the signed-in legal notice. -->

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

Recipe editing and translation use `/meals/[id]/edit` and `/meals/[id]/translate`; both require recipe edit access.

See [docs/schema.md](docs/schema.md) and [docs/api.md](docs/api.md).

Feature business cases (the _why_): [docs/business-cases/meal-calendar.md](docs/business-cases/meal-calendar.md), [docs/business-cases/recipes.md](docs/business-cases/recipes.md), [docs/business-cases/account-data.md](docs/business-cases/account-data.md).

## Svelte conventions

- Fetch page data via `load` in `+page.server.ts`/`+layout.server.ts` through server services/repositories, not `onMount`/`$effect` in components. Consume it via `let { data }: { data: PageData } = $props()`.
- Keep reusable controls in `$lib/components/ui`; colocate feature components under the owning route's `_components/`.
- Browser mutations go through `$lib/api`; server routes use guards/services, and only repositories import `db`.
- Prefer filtering, joins, and aggregation in repository SQL when doing so reduces rows or data transferred; keep TypeScript filtering for domain logic that SQL cannot express clearly.
- Plan `portions` is the number of people served; shopping quantities scale by `portions / meal.servings`.
- Profile `pantryStaples` are case-insensitive shopping-list exclusions, not inventory.
- Interactive state that should survive navigation/reload belongs in the URL (`?param=`) so `load` reruns automatically — don't shadow it in component `$state`.
- This project does **not** use `invalidate`/`invalidateAll` and does **not** use `use:enhance`. All mutations use `fetch()` against the REST endpoints (`src/routes/**/+server.ts`), then update local state directly: for an in-place edit, derive a writable copy of load data with `$derived` (e.g. `let plan = $derived(data.plan)`) and reassign it after the `fetch` (see `handleSlotChange`/`handleSettingsChange` in `src/routes/+page.svelte`); for a create/delete that changes which rows exist, `goto()` the new/`/` URL to re-run `load` (see `createPlan`/`deletePlan` in `src/routes/+page.svelte`). If a REST endpoint doesn't exist yet for a form, add one in `+server.ts` — don't use form actions.
- Note: `goto()` to the same route doesn't remount the component, so local `$state` for "is this form open" (e.g. `creating`) must be reset explicitly in the handler — see `createPlan` in `src/routes/+page.svelte`.
- Prefer `$derived`/`$derived.by` over `$effect`; reassigning a `$derived` value (Svelte 5.25+) is the idiomatic way to derive local editable state from a prop instead of `$effect`-syncing it into `$state`.
- Refs: [svelte.dev/docs/kit/load](https://svelte.dev/docs/kit/load), [svelte.dev/docs/svelte/best-practices](https://svelte.dev/docs/svelte/best-practices).

## Auth flow

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

## Self-improvement instructions

When updating this file:

1. **Add** new routes/tables immediately when created — one-liner per row is enough.
2. **Remove** stale entries — a wrong AGENTS.md is worse than a short one.
3. **Keep prose minimal** — if the code explains it, don't repeat it here.
4. **Flag** anything that surprised you with a `<!-- NOTE: ... -->` comment so the next agent sees it.
