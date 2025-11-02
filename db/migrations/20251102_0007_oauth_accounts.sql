create table if not exists public.oauth_accounts (
  provider text not null,
  provider_user_id text not null,
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (provider, provider_user_id)
);

create index if not exists idx_oauth_accounts_email on public.oauth_accounts (email);
