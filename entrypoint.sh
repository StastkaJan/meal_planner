#!/bin/sh
set -e
echo "Running migrations..."
node scripts-dist/migrate.js
echo "Seeding..."
node scripts-dist/seed.js
echo "Starting app..."
exec node index.js
