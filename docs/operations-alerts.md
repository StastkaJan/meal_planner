# Operational alerts

All production alerts go through Alertmanager to one Slack channel monitored by
the operator. Alert messages contain only alert names, aggregate measurements,
and fixed descriptions; they do not include request bodies, credentials, user
data, or route labels.

## Configure

1. Create a Slack incoming webhook for the monitored operations channel.
2. Store only its URL in a file outside version control, for example
   `./secrets/alert-webhook-url`.
3. Set `ALERT_WEBHOOK_URL_FILE` in `.env.production` to that file. The automated
   deployment starts the alerting services through the production overlay.

The checked-in example URL is deliberately unreachable, so an operator must set
the secret before relying on notifications.

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
