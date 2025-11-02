create table if not exists public.user_uploads (
  user_id text not null references public.users(xata_id) on delete cascade,
  key text not null,
  url text not null,
  thumb_url text,
  content_type text,
  size_bytes bigint,
  width int,
  height int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

create index if not exists idx_user_uploads_user_created on public.user_uploads (user_id, created_at desc);
