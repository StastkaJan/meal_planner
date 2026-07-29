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
- `$lib/server/domain`: pure algorithms and parsers.
- `$lib/server/repositories`: persistence grouped by aggregate, not physical table.
- `$lib/server/services`: operations spanning validation, domain logic, or repositories.

`PlanPopulationCommand` is the queue boundary for automatic plan generation.
It is serializable, executes inline today, and slot inserts ignore conflicts so a
future worker can retry it safely. Add queue infrastructure only when generation
latency requires background execution.
