#!/usr/bin/env bash
set -euo pipefail

if ! command -v dbtool >/dev/null 2>&1; then
  echo "[dbtool] dbtool not found in PATH; skipping migration." >&2
  exit 0
fi

DSN="${XATA_DATABASE_URL:-}"
FILE="${1:-db/migrations/20251028_add_stripe.sql}"

if [[ -z "${DSN}" ]]; then
  echo "[dbtool] XATA_DATABASE_URL is not set; cannot run migrations." >&2
  exit 1
fi

echo "[dbtool] Applying migration file: ${FILE}"

# Prefer an explicit subcommand if available; fallback to piping.
set +e
dbtool apply --dsn "${DSN}" --file "${FILE}"
rc=$?
set -e
if [[ $rc -ne 0 ]]; then
  echo "[dbtool] 'apply' failed or unsupported; trying exec via stdin..."
  dbtool exec --dsn "${DSN}" < "${FILE}"
fi

echo "[dbtool] Migration completed."

