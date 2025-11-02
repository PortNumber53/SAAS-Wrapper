#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dbname>" >&2
  echo "Example: $0 dbresumebuilder:main" >&2
  exit 1
fi

DBNAME="$1"

if ! command -v dbtool >/dev/null 2>&1; then
  echo "dbtool not found in PATH" >&2
  exit 2
fi

# Ensure tracking table exists
DB_SQL_CREATE_TRACKING='create table if not exists public._migrations (filename text primary key, applied_at timestamptz default now());'
dbtool query "$DBNAME" --query="$DB_SQL_CREATE_TRACKING" >/dev/null

apply_file() {
  f="$1"
  echo "[dbtool] Applying migration file: ${f}"
  dbtool query "$DBNAME" --query="$(tr '\n' ' ' < "$f")"
  dbtool query "$DBNAME" --query="insert into public._migrations(filename) values ('${f}') on conflict (filename) do nothing;" >/dev/null
}

if [[ -d "$(dirname "$0")/migrations" ]]; then
  for f in $(ls -1 "$(dirname "$0")/migrations"/*.sql 2>/dev/null | sort); do
    # Skip if already applied
    already=$(dbtool query "$DBNAME" --query="select 1 from public._migrations where filename='${f}'" --json || true)
    if [[ -n "$already" && "$already" != "[]" ]]; then
      echo "[dbtool] Skipping already applied: ${f}"
      continue
    fi
    apply_file "$f"
  done
else
  echo "[dbtool] No migrations directory found: $(dirname "$0")/migrations" >&2
fi

echo "[dbtool] All migrations applied."
