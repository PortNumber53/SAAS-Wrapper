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
