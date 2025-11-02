-- user_settings table (idempotent)
create table if not exists public.user_settings (
  user_id text not null references public.users(xata_id) on delete cascade,
  key text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

create unique index if not exists ux_user_settings_user_key on public.user_settings (user_id, key);
