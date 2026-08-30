# Roadmap

This is a candidate backlog, not a commitment. Prefer improvements that close
the plan -> shop -> cook loop or prevent user data loss.

## Product

### Later

1. **Household sharing** - shared plans, recipes, and synchronized shopping
   lists with explicit member permissions.
2. **Pantry staples** - mark ingredients such as salt or oil as always on hand
   and omit them from shopping lists. Do not build detailed stock accounting
   until users demonstrate a need for it.

## Reliability and operations

### P1 - detect and diagnose failures

No remaining P1 items.

### P2 - make releases recoverable

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

## Already present

- Leftover links between meal slots, with batch ingredients counted once.
- Per-plan enabled and custom meal slots respected by manual planning and auto-compose.
- Correlated JSON server logs and response `x-request-id` headers.
- Sanitized server error evidence with stack frames, deployment version, route,
  authenticated user ID, and strict private-field exclusion.
- Browser runtime error reporting.
- Database-aware `/health` and Prometheus `/metrics` endpoints.
- Grafana, Prometheus, Loki, and Alloy in Docker Compose.
- [Debug runbook](runbooks/debugging.md) from alerts or request IDs to metrics,
  correlated logs, and failing operations.
- Unit, E2E, formatting, type-check, and production build commands.
- GitHub Actions `quality` check for formatting, Svelte/type checks, unit tests,
  production builds, and focused E2E smoke tests. A repository admin must make
  it a required status check before GitHub enforces the gate.
- Daily encrypted off-host PostgreSQL backups with retention and failure webhook.
- Sustained 5xx, health, backup/restore, latency, and disk alerts routed through
  Alertmanager to one operator Slack channel; see the
  [alert runbook](operations-alerts.md).
- Daily restore verification in a guarded disposable database (RPO 24h, RTO 2h).
- A bounded deployment version in health responses, metrics, and structured logs.
- Pre-migration production backups and recovery notes for destructive SQL; see
  the [migration policy](migrations.md).
- Production containers start only the application; migrations are an explicit
  release step and development seed data stays outside the image.
- Weekly grouped dependency/image update PRs and high/critical vulnerability
  gates for the npm lockfile and built application image.
- Production Compose overlay with required secrets, private data/monitoring
  networks, automatic TLS termination, and loopback-only Grafana access.
- One-step application rollback to the inactive blue/green slot's retained
  image; see [deployment.md](deployment.md).
- Capacity dashboard and alerts for database size/connections, container memory,
  database disk, and slow operations; load testing remains evidence-gated.
- Recipe cooking mode with large steps, scaled quantities, screen wake lock, and
  lightweight timers.
- Private JSON account export and password-plus-email-confirmed account deletion.

## Explicitly defer

- AI-generated recipes and a social feed.
- Detailed pantry inventory, expiry forecasting, and price integrations.
- Distributed tracing, Kubernetes, a queue, and multiple observability vendors
  until traffic or incident evidence shows the current stack is insufficient.
