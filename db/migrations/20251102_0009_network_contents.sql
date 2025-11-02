create table if not exists public.network_contents (
  id text primary key,
  provider text not null,
  provider_user_id text not null,
  email text not null,
  content_type text,
  title text,
  url text,
  likes integer,
  comments integer,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_network_contents_email on public.network_contents (email);
create index if not exists idx_network_contents_provider_user on public.network_contents (provider, provider_user_id);
