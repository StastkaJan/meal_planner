# Meal Plan

Weekly meal planner. Create plans, assign meals to a breakfast/lunch/dinner grid across 7 days, and configure per-plan cuisine preferences and dietary restrictions.

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
