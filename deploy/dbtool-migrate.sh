#!/usr/bin/env bash
set -euo pipefail

if ! command -v dbtool >/dev/null 2>&1; then
  echo "[dbtool] dbtool not found in PATH; skipping migration." >&2
  exit 0
fi

DSN="${XATA_DATABASE_URL:-}"
FILE="${1:-}"

if [[ -z "${DSN}" ]]; then
  echo "[dbtool] XATA_DATABASE_URL is not set; cannot run migrations." >&2
  exit 1
fi

dbtool exec --dsn "${DSN}" <<'SQL'
create table if not exists public._migrations (
  filename text primary key,
  applied_at timestamptz default now()
);
SQL

apply_file() {
  f="$1"
  echo "[dbtool] Applying migration file: ${f}"
  set +e
  dbtool apply --dsn "${DSN}" --file "${f}"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    dbtool exec --dsn "${DSN}" < "${f}"
  fi
  dbtool exec --dsn "${DSN}" <<SQL
insert into public._migrations(filename) values ('${f}') on conflict (filename) do nothing;
SQL
}

if [[ -n "${FILE}" ]]; then
  apply_file "${FILE}"
else
  if [[ -d db/migrations ]]; then
    for f in $(ls -1 db/migrations/*.sql 2>/dev/null | sort); do
      already=$(dbtool exec --dsn "${DSN}" <<SQL
copy (select 1 from public._migrations where filename='${f}' limit 1) to stdout;
SQL
)
      if [[ -n "$already" ]]; then
        echo "[dbtool] Skipping already applied: ${f}"
        continue
      fi
      apply_file "${f}"
    done
  else
    echo "[dbtool] No migrations directory found."
  fi
fi

echo "[dbtool] Migration completed."
