# Capacity checks

The provisioned **Capacity Overview** Grafana dashboard tracks the Meal Plan
database, application, and Docker host using the existing Prometheus stack.
PostgreSQL metrics come from `postgres_exporter`; container memory and
filesystem metrics come from cAdvisor. Neither exporter publishes a host port.

## Thresholds and response

| Signal               | Warning                                                                                              | First response                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Database connections | above 80% for 15 minutes                                                                             | find long-lived sessions and confirm the app instance count before changing `max_connections` |
| Database size        | above 10 GiB for 1 hour                                                                              | inspect the largest tables and verify backup duration and repository space                    |
| App memory           | above 512 MiB for 15 minutes                                                                         | correlate the rise with a release and request/operation rate; restart only to restore service |
| Database memory      | above 1 GiB for 15 minutes                                                                           | inspect active queries and PostgreSQL cache settings                                          |
| Database filesystem  | below 15% free for 15 minutes                                                                        | expand or clean the Docker volume before attempting database maintenance                      |
| Slow operations      | at least 20 operations in 10 minutes and over 5% take one second or longer, sustained for 10 minutes | use the service and operation labels to find correlated logs and database activity            |

The absolute size and memory thresholds fit the current small, single-instance
deployment. Raise them only after recording normal peaks and confirming the
host and backup capacity.

## Missing capacity metrics

Check Prometheus **Status > Targets** for `postgres` and `containers`, then run:

```bash
docker compose ps
docker compose logs postgres-exporter cadvisor prometheus
```

The exporters are read-only. A missing target is an observability failure, not
evidence that the database or application is down.

## Database connections

Confirm current sessions before terminating anything:

```sql
select state, count(*) from pg_stat_activity group by state order by count(*) desc;
select pid, state, now() - query_start as age, wait_event_type, wait_event
from pg_stat_activity
where datname = 'mealplan'
order by query_start;
```

## Database size

Find growth by table:

```sql
select relname, pg_total_relation_size(relid) as bytes
from pg_catalog.pg_statio_user_tables
order by bytes desc
limit 20;
```

Do not delete data as an incident response. Confirm retention expectations and
take a verified backup before any cleanup.

## Memory

Compare the affected container with request rate, slow operations, and the
deployment time. For the app, also compare `process_resident_memory_bytes` with
cAdvisor working-set memory. A steadily rising value at stable traffic warrants
heap profiling in a controlled environment.

## Disk

Use `docker system df` to identify Docker-wide use and `docker volume inspect
meal-plan_pgdata` to locate the database volume. Do not run broad Docker prune
commands on a production host. Add capacity or remove a confirmed, recoverable
artifact.

## Slow operations

`slow_service_operations_total` counts completed service operations taking at
least one second. Start with the dashboard's `service` and `operation` labels,
then query Loki for the same fields:

```logql
{service_name=~"app(-blue|-green)?", event="service_operation"} | json | durationMs >= 1000
```

Inspect query plans only for the identified operation; avoid enabling verbose
SQL logging globally because it can expose private data and add load.

## Validation and load testing

After a monitoring change, validate that Prometheus targets are up, each panel
has data, and the alert rules load. A local one-second operation can confirm the
slow-operation counter without generating production traffic.

Load testing is deliberately deferred. Add a representative, rate-limited test
only after real usage shows sustained connection use above 50%, slow operations
above 1%, or memory growth that cannot be explained from normal traffic. Record
a production baseline first and never point a load test at production.
