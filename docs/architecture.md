# Application structure

Dependencies point inward:

```text
Svelte pages/components
  -> browser API modules
  -> SvelteKit routes and loads
  -> guards and services
  -> aggregate repositories
  -> Drizzle/PostgreSQL

services -> pure domain logic
```

## Placement rules

- `$lib/components/ui`: reusable, native HTML controls with styling and bindings.
- `routes/**/_components`: feature-specific UI owned by that route.
- `$lib/api`: browser-side REST calls grouped by feature.
- `$lib/database`: Drizzle client, seed, and one schema file per table.
- `$lib/domain`: pure business rules shared by browser and server code.
- `$lib/utils`: shared technical helpers such as date/time conversion.
- `$lib/server/repositories`: persistence grouped by aggregate, not physical table.
- `$lib/server/services`: operations spanning validation, domain logic, or repositories.

`PlanPopulationCommand` is the queue boundary for automatic plan generation.
It is serializable, executes inline today, and slot inserts ignore conflicts so a
future worker can retry it safely. Add queue infrastructure only when generation
latency requires background execution.

## Error evidence

Set `DEPLOYMENT_VERSION` to the immutable release or commit identifier. JSON
logs include it with the request ID and route. Unhandled server failures also
include the authenticated user ID and stack frames, but omit error messages and
all fields outside the logging allowlist. Do not add request bodies, credentials,
tokens, email addresses, or other user data to that allowlist.
