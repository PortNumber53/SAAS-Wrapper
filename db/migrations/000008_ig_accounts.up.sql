create table if not exists public.ig_accounts (
  ig_user_id text not null,
  page_id text not null,
  page_name text,
  username text,
  access_token text not null,
  expires_at timestamptz,
  email text not null,
  user_access_token text,
  user_expires_at timestamptz,
  user_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (ig_user_id, email)
);

create index if not exists idx_ig_accounts_email on public.ig_accounts (email);
create index if not exists idx_ig_accounts_user on public.ig_accounts (user_id);
