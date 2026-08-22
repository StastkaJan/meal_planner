# Roadmap

This is a candidate backlog, not a commitment. Prefer improvements that close
the plan -> shop -> cook loop or prevent user data loss.

## Product

### Next

1. **Persistent shopping lists** - save checked items, support custom items and
   exclusions, and group ingredients by aisle.

### Later

2. **Household sharing** - shared plans, recipes, and synchronized shopping
   lists with explicit member permissions.
3. **Pantry staples** - mark ingredients such as salt or oil as always on hand
   and omit them from shopping lists. Do not build detailed stock accounting
   until users demonstrate a need for it.
4. **Plan feedback** - record cooked/skipped meals and simple ratings, then use
   history to improve suggestions and reduce repetition.
5. **Cooking mode** - large readable steps, scaled quantities, screen wake lock,
   and lightweight timers.

## Reliability and operations

### P0 - protect user data

1. **Tested restore procedure** - document one restore command and run a
   scheduled restore into a disposable database. A backup is not complete until
   its restore has been verified. Initial target: RPO 24 hours, RTO 2 hours.

### P1 - detect and diagnose failures

4. **Actionable alerts** - alert on sustained 5xx errors, failed health checks,
   backup failures, high latency, and low disk space. Route alerts to one place
   an operator will actually monitor.
5. **Release identification** - expose a commit/version label in logs, metrics,
   and the health response so a regression can be tied to a deployment.
6. **Debug runbook** - document how to go from an alert or user-provided request
   ID to Grafana metrics, correlated Loki logs, and the failing operation.

### P2 - make releases recoverable

9. **Migration safety** - back up before schema changes, use backward-compatible
   expand/migrate/contract changes, and write a rollback or roll-forward note
   for every destructive migration.
10. **Deployment rollback** - keep the previous immutable application image and
    document the command that restores it. Exercise the rollback occasionally.
11. **Dependency and image updates** - automate update PRs and review them on a
    regular cadence; scan the shipped image and dependencies for known
    vulnerabilities.

### P3 - security and resilience

13. **Abuse controls that survive restarts** - move authentication rate limits
    out of process only if the app runs multiple instances or sees real abuse.
    The current Compose deployment runs one app instance, so keep the limiter
    in process. Revisit before adding a second instance, or when authentication
    rate-limit rejections occur in three consecutive 15-minute windows. The
    Grafana backend dashboard shows these rejections without recording IPs.
14. **Data export and account deletion** - allow users to download their recipes
    and plans and permanently delete their account, sessions, and personal data.
15. **Capacity checks** - monitor database size, connection use, memory, disk,
    and slow operations; add load testing only when usage justifies it.

## Already present

- Leftover links between meal slots, with batch ingredients counted once.
- Per-plan enabled and custom meal slots respected by manual planning and auto-compose.
- Correlated JSON server logs and response `x-request-id` headers.
- Sanitized server error evidence with stack frames, deployment version, route,
  authenticated user ID, and strict private-field exclusion.
- Browser runtime error reporting.
- Database-aware `/health` and Prometheus `/metrics` endpoints.
- Grafana, Prometheus, Loki, and Alloy in Docker Compose.
- Unit, E2E, formatting, type-check, and production build commands.
- GitHub Actions `quality` check for formatting, Svelte/type checks, unit tests,
  production builds, and focused E2E smoke tests. A repository admin must make
  it a required status check before GitHub enforces the gate.
- Daily encrypted off-host PostgreSQL backups with retention and failure webhook.
- Production containers start only the application; migrations are an explicit
  release step and development seed data stays outside the image.
- Weekly grouped dependency/image update PRs and high/critical vulnerability
  gates for the npm lockfile and built application image.
- Production Compose overlay with required secrets, private data/monitoring
  networks, automatic TLS termination, and loopback-only Grafana access.

## Explicitly defer

- AI-generated recipes and a social feed.
- Detailed pantry inventory, expiry forecasting, and price integrations.
- Distributed tracing, Kubernetes, a queue, and multiple observability vendors
  until traffic or incident evidence shows the current stack is insufficient.
