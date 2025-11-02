create table if not exists public.users (
  xata_id text primary key,
  email text not null,
  password text not null,
  name text default '',
  profile text default ''
);

create unique index if not exists ux_users_email on public.users (email);
