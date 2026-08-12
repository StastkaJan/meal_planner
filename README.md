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

`/metrics` requires the `METRICS_TOKEN` bearer token used by Prometheus. Set a
long random value in production; the Compose default is only for local use.

## Sentry

Set `PUBLIC_SENTRY_DSN` and `PUBLIC_SENTRY_ENVIRONMENT=production` at runtime.
The SDK captures browser and server errors, samples 10% of production traces,
and records privacy-masked replays only for sessions with errors. It sends the
internal numeric user ID, never email or default PII.

Production source-map upload needs `SENTRY_ORG`, `SENTRY_PROJECT`, a stable
`SENTRY_RELEASE` (normally the commit SHA), and a build-only auth token:

```bash
docker build \
  --build-arg SENTRY_ORG="$SENTRY_ORG" \
  --build-arg SENTRY_PROJECT="$SENTRY_PROJECT" \
  --build-arg SENTRY_RELEASE="$SENTRY_RELEASE" \
  --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
  -t meal-plan:"$SENTRY_RELEASE" .
```

After the first production event, configure these in Sentry:

- An issue alert for new and regressed issues in the `production` environment.
- A metric alert for elevated error volume, tuned after a week of baseline data.
- An uptime monitor for the public `https://<host>/health` URL from outside the
  Docker host. Keep the Compose health check for container orchestration only.
