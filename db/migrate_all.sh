#!/usr/bin/env bash
set -euo pipefail

DBNAME="${1:-}"

if ! command -v dbtool >/dev/null 2>&1; then
  echo "dbtool not found in PATH" >&2
  exit 2
fi

# Ensure tracking table exists
DB_SQL_CREATE_TRACKING='create table if not exists public._migrations (filename text primary key, applied_at timestamptz default now());'
if [[ -n "$DBNAME" ]]; then
  dbtool query "$DBNAME" --query="$DB_SQL_CREATE_TRACKING" >/dev/null
else
  dbtool query --query="$DB_SQL_CREATE_TRACKING" >/dev/null
fi

apply_file() {
  f="$1"
  echo "[dbtool] Applying migration file: ${f}"
  if [[ -n "$DBNAME" ]]; then
    dbtool query "$DBNAME" --query="$(tr '\n' ' ' < "$f")"
    dbtool query "$DBNAME" --query="insert into public._migrations(filename) values ('${f}') on conflict (filename) do nothing;" >/dev/null
  else
    dbtool query --query="$(tr '\n' ' ' < "$f")"
    dbtool query --query="insert into public._migrations(filename) values ('${f}') on conflict (filename) do nothing;" >/dev/null
  fi
}

if [[ -d "$(dirname "$0")/migrations" ]]; then
  for f in $(ls -1 "$(dirname "$0")/migrations"/*.sql 2>/dev/null | sort); do
    # Skip if already applied
    if [[ -n "$DBNAME" ]]; then
      already=$(dbtool query "$DBNAME" --query="select 1 from public._migrations where filename='${f}'" --json || true)
    else
      already=$(dbtool query --query="select 1 from public._migrations where filename='${f}'" --json || true)
    fi
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
