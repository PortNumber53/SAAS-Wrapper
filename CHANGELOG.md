# Changelog

## 2025-11-02

- Add migration tracking with `_migrations` and ordered application.
- Add local runner `db/migrate_all.sh`.
- Upgrade deploy runner `deploy/dbtool-migrate.sh` to apply/skip pending migrations and record applied files.
- Add idempotent, Xata-agnostic migration files:
  - `db/migrations/20251027_users.sql`
  - `db/migrations/20251028_add_stripe.sql`
  - `db/migrations/20251102_0002_ig_media.sql`
  - `db/migrations/20251102_0003_user_settings.sql`
  - `db/migrations/20251102_0004_user_uploads.sql`
  - `db/migrations/20251102_0005_user_drafts.sql`
  - `db/migrations/20251102_0007_oauth_accounts.sql`
  - `db/migrations/20251102_0008_ig_accounts.sql`
  - `db/migrations/20251102_0009_network_contents.sql`
- Remove obsolete `db/migrate_stripe_with_dbtool.sh`.
- Remove redundant `db/migrations/20251102_0006_users.sql`.
- Jenkins: rename stage to "DB Migrate (All)", add `dbtool --version` diagnostics, and invoke `deploy/dbtool-migrate.sh` to apply pending migrations when `XATA_DATABASE_URL` is set.
- Make `db/migrate_all.sh` database name parameter optional; when omitted, dbtool uses its own configuration.
- Fix `db/migrate_all.sh` to execute SQL statements individually (split by semicolons) instead of squashing files into single-line queries, preventing Xata type catalog conflicts.
