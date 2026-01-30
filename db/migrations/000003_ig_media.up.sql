-- ig_media table and indexes (idempotent)
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

create index if not exists idx_ig_media_email_time on public.ig_media (email, timestamp desc);
create index if not exists idx_ig_media_user_time on public.ig_media (ig_user_id, timestamp desc);

alter table public.ig_media add column if not exists raw_payload jsonb;
