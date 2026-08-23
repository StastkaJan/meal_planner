# Operational alerts

All production alerts go through Alertmanager to one operator-monitored Slack or
Discord channel. Alert messages contain only alert names, aggregate
measurements, and fixed descriptions; they do not include request bodies,
credentials, user data, or route labels.

## Configure

1. Create a Slack incoming webhook or a Discord channel webhook. Append `/slack`
   to a Discord webhook URL so it accepts Alertmanager's Slack payload.
2. Set the complete URL as `ALERT_WEBHOOK_URL` in `.env.production`. Docker
   Compose mounts its value only into Alertmanager as
   `/run/secrets/alert_webhook_url`.
3. Deploy; the automated deployment starts the alerting services through the
   production overlay.

The example value is not a credential, so an operator must replace it before
deploying.

## Alerts

| Alert                       | Fires when                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `SustainedHttp5xxErrors`    | at least three 5xx responses remain in the rolling five-minute window for five minutes |
| `HealthCheckFailed`         | the database-aware `/health` probe fails for two minutes                               |
| `BackupFailed`              | `pg_dump`, upload, retention, or repository initialization fails                       |
| `RestoreVerificationFailed` | scheduled restore verification fails                                                   |
| `HighHttpLatency`           | mean HTTP latency exceeds one second for ten minutes                                   |
| `HostDiskSpaceLow`          | host root filesystem availability stays below 10% for fifteen minutes                  |

Prometheus groups repeated notifications by alert name. Firing alerts repeat
every four hours; resolved notifications are suppressed to avoid reporting a
one-shot backup alert as recovered merely because it expired.

## Validate and test

Validate interpolation without starting containers:

```sh
docker compose --env-file .env.production -f docker-compose.yml \
  -f docker-compose.production.yml --profile production config --quiet
```

With the stack running, validate the live configuration:

```sh
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
docker compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

Send a synthetic alert from the backup container, then confirm it appears in
the monitored Slack channel:

```sh
docker compose --env-file .env.production -f docker-compose.yml \
  -f docker-compose.production.yml --profile production exec backup curl -fsS \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"AlertPipelineTest","severity":"warning"},"annotations":{"summary":"Alert pipeline test","description":"Safe to ignore."}}]' \
  http://alertmanager:9093/api/v2/alerts
```
