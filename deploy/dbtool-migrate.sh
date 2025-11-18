#!/usr/bin/env bash
set -euo pipefail

if ! command -v dbtool >/dev/null 2>&1; then
  echo "[dbtool] dbtool not found in PATH; skipping migration." >&2
  exit 0
fi

# Basic sanity check: ensure dbtool is an executable binary/script, not an archive or placeholder.
if ! dbtool --version >/dev/null 2>&1; then
  echo "[dbtool] dbtool is present but not executable (or not a valid binary); skipping migration." >&2
  exit 0
fi

FILE="${1:-}"

if [[ -z "${XATA_DATABASE_URL:-}" ]]; then
  echo "[dbtool] XATA_DATABASE_URL is not set; cannot run migrations." >&2
  exit 1
fi

run_sql() {
  local sql="$1"
  dbtool query --query="${sql}"
}

# Ensure migrations bookkeeping table exists
run_sql 'create table if not exists public._migrations (
  filename text primary key,
  applied_at timestamptz default now()
);'

apply_file() {
  local f="$1"
  echo "[dbtool] Applying migration file: ${f}"

  # Skip if already recorded
  local already
  already=$(dbtool query --query="copy (select 1 from public._migrations where filename='${f}' limit 1) to stdout;")
  if [[ -n "${already}" ]]; then
    echo "[dbtool] Skipping already applied: ${f}"
    return 0
  fi

  # Read file contents and run as a single SQL query
  local sql
  sql="$(cat "${f}")"
  set +e
  dbtool query --query="${sql}"
  local rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "[dbtool] Migration failed for ${f} (exit ${rc})" >&2
    exit $rc
  fi

  run_sql "insert into public._migrations(filename) values ('${f}') on conflict (filename) do nothing;"
}

if [[ -n "${FILE}" ]]; then
  apply_file "${FILE}"
else
  if [[ -d db/migrations ]]; then
    for f in $(ls -1 db/migrations/*.sql 2>/dev/null | sort); do
      apply_file "${f}"
    done
  else
    echo "[dbtool] No migrations directory found."
  fi
fi

echo "[dbtool] Migration completed."

