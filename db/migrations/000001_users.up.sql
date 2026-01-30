create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  password text not null,
  name text default '',
  profile text default ''
);

create unique index if not exists ux_users_email on public.users (email);
