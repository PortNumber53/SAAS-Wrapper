create table if not exists public.user_drafts (
  user_id text not null references public.users(xata_id) on delete cascade,
  ig_user_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, ig_user_id)
);

create index if not exists idx_user_drafts_user_updated on public.user_drafts (user_id, updated_at desc);
