# Meal Plan

Weekly meal planner. Assign meals to a breakfast/lunch/dinner grid across 7 days, and configure cuisine preferences and dietary restrictions.

## Stack

- SvelteKit + TypeScript
- PostgreSQL + Drizzle ORM
- Docker

## Dev

```bash
docker-compose up -d   # start DB
npm install
npm run db:migrate
npm run dev
```

## DB

```bash
npm run db:generate   # generate migrations after schema changes
npm run db:migrate    # apply migrations
npm run db:seed       # seed meals
```

## Monitoring

`docker compose up -d` starts the provisioned monitoring stack:

- Grafana dashboard: http://localhost:3001 (default `admin` / `admin`)
- Prometheus: http://localhost:9090
- Alloy collector diagnostics: http://localhost:12345

Set `GRAFANA_ADMIN_PASSWORD` in `.env` before using the stack outside local development. Metrics and logs are retained for seven days.

For incident triage, follow the [debugging runbook](docs/runbooks/debugging.md)
from an alert or response `x-request-id` to metrics, correlated logs, and the
failing backend operation.

## Backups

The production Compose profile takes an encrypted PostgreSQL backup on startup
and at 02:00 UTC daily, then keeps 7 daily, 4 weekly, and 6 monthly snapshots in an
off-host [Restic repository](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html).
Set the backup variables from `.env.example`, including an operator-monitored
webhook, then start it with:

```bash
docker compose --profile production up -d backup
```

Check the latest snapshot with `docker compose exec backup restic snapshots`.
The Restic password is required to restore data; store a separate copy outside
the server.
