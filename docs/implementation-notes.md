# Implementation notes

Feature and operational details moved from `AGENTS.md`. Read the section relevant to your task; code is the source of truth. Update these notes when the described behavior changes. Keep working rules in [AGENTS.md](../AGENTS.md).

## Tooling and CI

See [dependency updates](dependency-updates.md) for the update workflow.

- SvelteKit inlines stylesheets below 7,000 characters, including the landing page and shared shell CSS, to avoid render-blocking requests on first visits. Larger stylesheets remain separately cached; small styles are included in each HTML response.

- The shell imports its logo through Vite with `?no-inline`, producing a content-hashed URL under `/_app/immutable/` with the Node adapter's one-year immutable caching.

- Type checks use TypeScript 7 through the `@typescript/native-preview` npm alias and `svelte-check --tsgo`; TypeScript 6 remains installed for tools that still require its legacy compiler API.

- Husky's pre-commit hook formats staged files and runs Svelte/TypeScript checks.

- Dependabot proposes weekly npm, Docker, and Actions updates; `Dependency security` audits the lockfile and scans the built application image.

- `.github/workflows/quality.yml` defines the release quality check, validates Prometheus capacity rules, explicitly migrates and seeds its test database before smoke tests, and deploys successful `main` pushes to the VPS. A repository admin must configure its hosted `quality` job as a required status check before GitHub enforces it for merges or deployment.

## Deployment and backups

See [production](production.md), [WireGuard](wireguard.md), and [migrations](migrations.md) before changing deployment or recovery behavior.

- Production containers start only the app. The image bundles the production migration runner for an explicit release step; development seeds are never bundled or run on startup.

- Production deploys reconcile monitoring service definitions so new mounts and scrape configuration take effect; named volumes preserve monitoring data.

- The runtime image upgrades Alpine's OpenSSL packages over the digest-pinned Node base before security scanning.

- The `production` Compose profile runs encrypted daily PostgreSQL and recipe-image backups and verifies restores in a guarded tmpfs database; both failures post to Alertmanager; production deployment also requires `docker-compose.production.yml`.

- Production serves `papuplan.cz` via `docker-compose.production.yml`: required secrets, an internal Caddy on the shared `public-web` Docker network behind the VPS TLS proxy, private database/monitoring networks, WireGuard-only Grafana and PostgreSQL host ports, and blue/green app slots switched by `scripts/deploy-production.sh`. PostgreSQL also joins the non-internal `admin` network because Docker cannot publish a port from an exclusively internal network. See `docs/production.md` and `docs/wireguard.md`.

- Same-repository PRs deploy to `pr-N.papuplan.cz` after CI; both preview workflows use the outer Caddy in `/home/github/portfolio`, independently of the SSH user's home. `db:seed:preview` adds Free/Pro users and both admin variants, scoped recipes, plans, and review fixtures without production DB access. The first demo deployment clears legacy preview DB/image volumes; later seeds preserve existing accounts and edits. Demo logins are in `docs/production.md`. Exact-host Caddy routes and all preview state are removed when the PR closes.

- `scripts/deploy-production.sh` takes an off-host backup before migrations; destructive SQL requires a recovery note under `drizzle/notes/`, enforced by CI.

- Backup scheduler restarts do no repository work; backups/restores run daily and retention pruning weekly. A failed pre-deploy backup may be bypassed only when the release migration fingerprint matches the active image; first deploys and migration changes still fail closed.

- `bash scripts/deploy-production.sh rollback` switches to the inactive slot's retained image; it rolls back app code only, so check migration compatibility first.

## Observability

See the [debugging runbook](runbooks/debugging.md), [capacity guide](capacity.md), and [alert operations](operations-alerts.md) when investigating failures.

- HTTP and service operations emit allowlisted JSON logs with request ID, route, and `DEPLOYMENT_VERSION`; the bounded version is also exposed by `/health` and `app_release_info`. Server failures retain message-free stack frames and authenticated user ID. `/metrics` feeds Grafana at :3001. Alloy ships all Docker logs to Loki.

- Use `docs/runbooks/debugging.md` to trace alerts or `x-request-id` values through Grafana metrics and Loki logs.

- Browser runtime failures post to `/client-errors`, increment `client_errors_total`, and log to Loki as `client_error`.

- PostgreSQL exporter and cAdvisor feed the Capacity Overview dashboard and `monitoring/capacity-alerts.yml`; thresholds and response steps live in `docs/capacity.md`.

- Prometheus alerts on sustained 5xx, `/health` failures, latency, and host disk; backup failures post to the same Alertmanager Slack-compatible route, sourced from production `ALERT_WEBHOOK_URL`.

- HTTP/service duration histograms expose route p95; `/metrics` also reports database-pool queue depth and event-loop delay. HighHttpLatency uses route p95 with a minimum traffic guard. Uploaded images use private ETag revalidation after authorization.

## Accounts, access, and legal documents

See [account data business cases](business-cases/account-data.md).

- Set `users.is_admin=true` to grant global recipe import/review/edit access.

- `/admin/recipes` manages shared recipes and imports; `/admin/users` lets admins grant or revoke admin access for other users.

- `users.is_pro` is the temporary billing entitlement switch. Pro gates recipe URL import, auto-compose, copy-week, day recalculation, and single-meal reroll; admins manage it in `/admin/users` until billing owns the flag.

- `/pricing` is public and explains Free/Pro access; admins manage the temporary `is_pro` entitlement in `/admin/users`.

- `/` is the public EN/CS product and vision landing page; the protected planner lives at `/planner`, including after sign-in and registration. Legacy home URLs with planner query parameters redirect to `/planner` with their filters intact. Hash links scroll smoothly unless reduced motion is requested.

- `/robots.txt` is a public static text file so crawlers receive directives instead of the sign-in page. Application authorization still protects private pages.

- `/llms.txt` is a public Markdown summary with links to the product, pricing, and legal pages for AI agents.

- Unmatched URLs return 404 for visitors; the root layout redirects to sign-in only for matched private page routes. This also lets discovery clients distinguish absent optional manifests from HTML login pages.

- The landing language switcher uses `?lang=en|cs` and the existing locale cookie for visitors' subsequent pages. Explicit landing language overrides the account locale on `/` only; account language preferences remain unchanged.

- `/legal/terms` and `/legal/privacy` are prerendered from the versioned UTF-8 legal Markdown used by registration and account notices.

- Auth rate limits remain in-process; expired entries are pruned every minute. New sessions trigger expired-session cleanup at most hourly. Move rate limits to shared storage before scaling out, or after 429s persist for three 15-minute windows.

- Account-export subqueries use `qualifiedColumn` because Drizzle strips plain column qualifiers in single-table selections, including nested SQL.

- `/profile/export` returns only caller-owned account data, including uploaded recipe images and legal-document events; `DELETE /profile` requires the current password plus exact email, preserves global meals, and rejects deletion of the final administrator.

- `legal_document_events` records each terms acceptance or privacy-notice acknowledgement by user, document, and version; missing current-version rows drive the signed-in legal notice.

## Planner and nutrition

See [meal calendar business cases](business-cases/meal-calendar.md).

- `POST /plans/[id]/reroll-meal` replaces only the requested slot with a different matching recipe; `POST /plans/[id]/clear` clears meals and extras for `{date}` or the viewed week with `{week}`, preserving settings and repeat patterns; empty scopes are rejected. The planner offers Clear week and opens settings for empty weeks.

- The calendar fetches at most 30 picker recipes only while `pickDate`/`pickSlot` are in the URL; `pickQuery`, `pickMine`, and `pickPage` preserve picker filters and pagination across reloads.

- Leftovers UI/API/shopping exclusions are removed; every planned meal counts toward shopping. The retired `slot_leftovers` table is retained for deployment compatibility; slot replacement, reroll, and copy-week clear affected links atomically for rollback.

- `saved_extras` stores private reusable extras, included in account exports and deleted with the account. `/extras` (POST) and `/extras/[id]` (DELETE) manage them; planner load supplies a searchable picker with common presets including latte/cappuccino; selecting a preset or saved extra adds it immediately.

- Profile nutrition goals include nullable decimal `fiber_target`, `sugar_target`, `saturated_fat_target`, and `salt_target` in `user_settings`; blank uses defaults. These four goals affect chart progress only; auto-compose uses calories and macros. Nutrient slices reveal values on hover, focus, or click.

- `plans.meal_slots` is the ordered enabled slot list; disabling one transactionally removes its assignments and repeat pattern.

- Auto-compose/recalc/reroll share a 10% calorie tolerance and increasing reuse/proximity penalties; snacks get smaller initial budgets. Explicit repeat groups count once and recalculation preserves existing group recipes. Stored recipe nutrition is per serving; plan portions scale shopping only.

## Recipes, ingredients, and localization

See [recipe business cases](business-cases/recipes.md), [schema](schema.md), and [API routes](api.md).

- `user_settings.locale` selects the `en`/`cs` app interface and `meal_translations` overlays for recipe name/description/ordered ingredients/instructions; nullable translated fields fall back to the original recipe.

- The root `+error.svelte` provides localized 404 and server-error UI.

- Uploaded recipe images are resized to at most 1200x900, converted to WebP, and stored in the shared `recipe-images` volume; `/meals/[id]/image` serves and manages them, and app containers set `BODY_SIZE_LIMIT=6M`.

- `/admin/ingredients` searches the shared catalogue; `/admin/ingredients/new` and `/admin/ingredients/[id]` create/edit names, locale translations and normalized aliases through admin-only POST/PUT endpoints. Creation reuses a matching private identity; direct private-ID edits remain forbidden. Saving replaces the locale set atomically. Migration 0027 reconciles aliases and case/whitespace variants in recipe, pantry, and picker IDs; its advanced timestamp also repairs earlier previews.

- Ingredient pickers use `ingredients` identities, locale-keyed `ingredient_translations` (name, normalized aliases), and private `user_ingredients` links; `POST /ingredients` returns locale maps. Missing labels fall back to the original name; migration 0027 retains legacy mixed-language aliases under `und` and old columns for rollback. Recipe rows retain `original_name`; shopping aggregates IDs with compatible units. Account export includes custom options and translations; deletion removes unreferenced private ingredients.
