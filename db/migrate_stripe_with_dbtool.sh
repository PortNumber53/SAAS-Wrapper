#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dbname>" >&2
  echo "Example: $0 dbresumebuilder:main" >&2
  exit 1
fi

DBNAME="$1"
SQL_FILE="$(cd "$(dirname "$0")" && pwd)/migrations/20251028_add_stripe.sql"

if ! command -v dbtool >/dev/null 2>&1; then
  echo "dbtool not found in PATH" >&2
  exit 2
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Migration file not found: $SQL_FILE" >&2
  exit 3
fi

echo "[dbtool] Applying Stripe migration to database '$DBNAME' from $SQL_FILE"
dbtool query "$DBNAME" --query="$(tr '\n' ' ' < "$SQL_FILE")"

echo "[dbtool] Verifying tables exist..."
dbtool query "$DBNAME" --query="select to_regclass('public.stripe_products') as stripe_products, to_regclass('public.stripe_prices') as stripe_prices;" --json

echo "[dbtool] Done."

