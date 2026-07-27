#!/bin/sh
set -e
echo "Running migrations..."
npx drizzle-kit migrate
echo "Seeding..."
node scripts-dist/seed.js
echo "Starting app..."
exec node index.js
