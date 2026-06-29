# Meal Plan

SvelteKit app with PostgreSQL (Drizzle ORM) for meal planning.

## Stack

- SvelteKit + TypeScript
- PostgreSQL + Drizzle ORM
- Docker

## Dev

```bash
docker-compose up -d   # start DB
npm install
npm run dev
```

## DB

```bash
npm run db:generate   # generate migrations
npm run db:migrate    # apply migrations
npm run db:seed       # seed data
```
