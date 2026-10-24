#!/bin/sh
set -e

# Run pending migrations before the app boots. Never use `pnpm exec` here:
# corepack would download a pnpm release at runtime and re-resolve node_modules,
# wiping the Prisma client generated during the image build.
if [ -n "$DATABASE_URL" ]; then
  echo "=== Running database migrations..."
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy || echo "WARNING: migrate deploy failed, continuing..."
  else
    echo "WARNING: prisma CLI not found, skipping migrations"
  fi
fi

exec "$@"
