# Debugging alerts and request IDs

Use this runbook to move from an alert or a response `x-request-id` to the
affected route and backend operation. Open Grafana at <http://localhost:3001>
(use the production SSH tunnel in [the deployment guide](../production.md)),
then open **Meal Plan / Application Overview**. Set the Grafana time range
around the incident before querying. Logs and metrics are retained for seven
days.

## Start from an alert

1. Record when the alert started, its service, and any `route`, `status`,
   `service`, or `operation` labels. Use the same time range in Grafana.
2. Check the Application Overview panels for backend availability, 5xx rate,
   request latency, and service operation errors or latency.
3. In **Explore**, select Prometheus and use the query that matches the signal:

   ```promql
   up{job="meal-plan"}
   ```

   ```promql
   sum by (method, route, status) (rate(http_requests_total{status=~"5.."}[5m]))
   ```

   ```promql
   1000 * sum by (method, route) (rate(http_request_duration_seconds_sum[5m]))
     / clamp_min(sum by (method, route) (rate(http_requests_total[5m])), 0.000001)
   ```

   ```promql
   sum by (service, operation) (rate(service_operations_total{outcome="error"}[5m]))
   ```

   ```promql
   1000 * sum by (service, operation) (rate(service_operation_duration_seconds_sum[5m]))
     / clamp_min(sum by (service, operation) (rate(service_operations_total[5m])), 0.000001)
   ```

   Prometheus counters reset when the app restarts, but `rate` handles a
   reset. Use the graph to identify the failing route or `service.operation`.

4. Select Loki in Explore. For a failing route, find a representative request
   log, then copy its `requestId`:

   ```logql
   {service_name=~"app(-blue|-green)?", event="http_request", route="/replace/with/route", status=~"5.."}
   ```

   If the alert already names an operation, find its error directly:

   ```logql
   {service_name=~"app(-blue|-green)?", event="service_operation", service="replace", operation="replace"}
     | json
     | outcome = "error"
   ```

   For a non-app container alert, start with `{service_name="backup"}` or the
   relevant Docker Compose service name. Those logs may not be JSON.

## Start from a request ID

Users or upstream proxies can provide the `x-request-id` response header. To
confirm correlation locally, send a safe request with a recognizable ID:

```bash
curl -i -H 'x-request-id: runbook-check-001' http://localhost:3000/health
```

In Grafana Explore, select Loki, set the correct time range, and run:

```logql
{service_name=~"app(-blue|-green)?"}
  | json
  | requestId = "runbook-check-001"
```

The correlated lines show:

- `http_request`: `method`, SvelteKit `route`, `status`, and `durationMs`;
- `http_request_failed`: an uncaught request error;
- `service_operation`: `service`, `operation`, `outcome`, `durationMs`, and a
  sanitized `errorType`/stack when the operation threw.

An HTTP 5xx may be handled by SvelteKit and therefore have no
`http_request_failed` line. In that case, use the `http_request` line and any
`service_operation` line with the same request ID. No operation line means the
route failed outside an instrumented service; use its route and error log to
locate the handler.

If there is no result, preserve the exact case and punctuation, widen the time
range, and confirm the request reached this environment. Request IDs are JSON
fields rather than Loki labels to avoid high-cardinality indexes, so `| json`
is required. Logs older than seven days are unavailable in the default stack.

## Decide, escalate, verify

Escalate immediately when health remains down, errors are sustained, or there
is suspected data loss, credential exposure, or unauthorized access. Provide
the UTC incident window, request ID, route/method/status, failing
`service.operation`, error type, and sanitized stack frames. Do not paste full
private logs into public issues.

After mitigation, repeat only a safe read such as `/health` or the original
non-mutating request. Verify `up{job="meal-plan"} == 1`, the relevant error
rate has returned to zero, and a successful correlated request appears in
Loki. Do not replay a create, update, import, or delete just to verify logging.

## Access and privacy

Grafana and Prometheus use local ports in development. Production keeps
Prometheus private and binds Grafana to host loopback for SSH-tunnel access.
Logs can contain user IDs, routes, error types, and sanitized stack frames;
grant only incident responders access. A request ID is a correlation value,
not a secret or proof of identity. Never query by or share passwords, session
cookies, tokens, recipe bodies, or other user-provided content. If any appear
in logs, treat it as a security incident and restrict the affected log access.
