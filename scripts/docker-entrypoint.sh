#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && { [ -z "${PGHOST:-}" ] || [ -z "${PGUSER:-}" ] || [ -z "${PGDATABASE:-}" ]; }; then
  echo "ERROR: Set DATABASE_URL, or PGHOST/PGUSER/PGDATABASE." >&2
  exit 1
fi

if [ -z "${BETTER_AUTH_URL:-}" ]; then
  echo "ERROR: BETTER_AUTH_URL is required." >&2
  exit 1
fi

if [ -z "${BETTER_AUTH_SECRET:-}" ] || [ "${#BETTER_AUTH_SECRET}" -lt 32 ]; then
  echo "ERROR: BETTER_AUTH_SECRET must be at least 32 characters." >&2
  exit 1
fi

case "$BETTER_AUTH_SECRET" in
  replace-*|*replace-with*)
    echo "ERROR: Replace the placeholder BETTER_AUTH_SECRET with a generated secret." >&2
    exit 1
    ;;
esac

if [ -n "${PGPASSWORD:-}" ]; then
  case "$PGPASSWORD" in
    replace-*|*replace-with*)
      echo "ERROR: Replace the placeholder POSTGRES_PASSWORD with a generated password." >&2
      exit 1
      ;;
  esac
fi

case "$BETTER_AUTH_URL" in
  http://*|https://*) ;;
  *)
    echo "ERROR: BETTER_AUTH_URL must start with http:// or https://." >&2
    exit 1
    ;;
esac

case "$BETTER_AUTH_URL" in
  https://*) ;;
  *)
    echo "WARNING: BETTER_AUTH_URL is not HTTPS. Use HTTPS in production." >&2
    ;;
esac

echo "Running database migrations..."
node scripts/migrate.mjs

echo "Starting Hub on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec node server.js
