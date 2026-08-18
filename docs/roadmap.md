# Roadmap

This is a candidate backlog, not a commitment. Prefer improvements that close
the plan -> shop -> cook loop or prevent user data loss.

## Product

### Next

1. **Leftovers and batch cooking** - let a slot consume servings prepared by an
   earlier meal without adding the same ingredients to the shopping list again.
2. **Persistent shopping lists** - save checked items, support custom items and
   exclusions, and group ingredients by aisle.
3. **Configurable meal slots** - let users disable snacks, plan only selected
   meal types, or add a custom slot; auto-compose fills enabled slots only.

### Later

4. **Household sharing** - shared plans, recipes, and synchronized shopping
   lists with explicit member permissions.
5. **Pantry staples** - mark ingredients such as salt or oil as always on hand
   and omit them from shopping lists. Do not build detailed stock accounting
   until users demonstrate a need for it.
6. **Plan feedback** - record cooked/skipped meals and simple ratings, then use
   history to improve suggestions and reduce repetition.
7. **Cooking mode** - large readable steps, scaled quantities, screen wake lock,
   and lightweight timers.

## Reliability and operations

### P0 - protect user data

1. **Tested restore procedure** - document one restore command and run a
   scheduled restore into a disposable database. A backup is not complete until
   its restore has been verified. Initial target: RPO 24 hours, RTO 2 hours.
2. **Production-safe startup** - run migrations as a deliberate release step
   and do not run development seed data on every application start.

### P1 - detect and diagnose failures

4. **Actionable alerts** - alert on sustained 5xx errors, failed health checks,
   backup failures, high latency, and low disk space. Route alerts to one place
   an operator will actually monitor.
5. **Better error evidence** - retain sanitized server stack traces, deployment
   version, route, user ID where appropriate, and the existing request ID. Never
   log passwords, session tokens, recipe import bodies, or other private data.
6. **Release identification** - expose a commit/version label in logs, metrics,
   and the health response so a regression can be tied to a deployment.
7. **Debug runbook** - document how to go from an alert or user-provided request
   ID to Grafana metrics, correlated Loki logs, and the failing operation.

### P2 - make releases recoverable

8. **CI quality gate** - require formatting, Svelte/type checks, unit tests, a
   production build, and focused E2E smoke tests before deployment.
9. **Migration safety** - back up before schema changes, use backward-compatible
   expand/migrate/contract changes, and write a rollback or roll-forward note
   for every destructive migration.
10. **Deployment rollback** - keep the previous immutable application image and
    document the command that restores it. Exercise the rollback occasionally.
11. **Dependency and image updates** - automate update PRs and review them on a
    regular cadence; scan the shipped image and dependencies for known
    vulnerabilities.

### P3 - security and resilience

12. **Production secrets and network boundaries** - remove default credentials,
    rotate secrets, keep PostgreSQL and metrics private, terminate TLS, and
    restrict Grafana access.
13. **Abuse controls that survive restarts** - move authentication rate limits
    out of process only if the app runs multiple instances or sees real abuse.
14. **Capacity checks** - monitor database size, connection use, memory, disk,
    and slow operations; add load testing only when usage justifies it.

## Already present

- Correlated JSON server logs and response `x-request-id` headers.
- Browser runtime error reporting.
- Database-aware `/health` and Prometheus `/metrics` endpoints.
- Grafana, Prometheus, Loki, and Alloy in Docker Compose.
- Unit, E2E, formatting, type-check, and production build commands.
- Daily encrypted off-host PostgreSQL backups with retention and failure webhook.
- Private JSON account export and password-plus-email-confirmed account deletion.

## Explicitly defer

- AI-generated recipes and a social feed.
- Detailed pantry inventory, expiry forecasting, and price integrations.
- Distributed tracing, Kubernetes, a queue, and multiple observability vendors
  until traffic or incident evidence shows the current stack is insufficient.
