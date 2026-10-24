#!/bin/sh
set -e

echo "=== Running database migrations..."
if [ -n "$DATABASE_URL" ]; then
  pnpm exec prisma migrate deploy || echo "WARNING: migrate deploy returned non-zero, continuing..."
fi

exec "$@"
