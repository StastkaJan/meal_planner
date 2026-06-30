#!/bin/sh
set -e
echo "Running migrations..."
npx drizzle-kit migrate
echo "Seeding..."
npx tsx src/lib/seed.ts
echo "Starting app..."
exec node index.js
