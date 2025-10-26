-- Xata (Postgres) schema for Instagram media caching
-- This table stores media fetched from the Instagram Graph API so the app
-- does not need to refetch on every request.

create table if not exists public.ig_media (
  media_id text primary key,
  ig_user_id text not null,
  caption text,
  media_type text,
  media_url text,
  permalink text,
  thumbnail_url text,
  timestamp timestamptz,
  email text,
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helpful indexes for list and filter queries
create index if not exists idx_ig_media_email_time on public.ig_media (email, timestamp desc);
create index if not exists idx_ig_media_user_time on public.ig_media (ig_user_id, timestamp desc);

-- Migration helper for existing tables missing raw_payload
alter table public.ig_media add column if not exists raw_payload jsonb;

-- User-scoped settings and credentials
-- Stores arbitrary JSON config per user and logical key.
-- Enforces uniqueness on (user_id, key) and references users.xata_id.
create table if not exists public.user_settings (
  user_id text not null references public.users(xata_id) on delete cascade,
  key text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
create unique index if not exists ux_user_settings_user_key on public.user_settings (user_id, key);
