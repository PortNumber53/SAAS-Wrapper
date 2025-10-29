-- Stripe integration tables (idempotent)
create table if not exists public.stripe_products (
  id bigserial primary key,
  user_id text not null references public.users(xata_id) on delete cascade,
  stripe_product_id text not null unique,
  name text not null,
  description text default '',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.stripe_prices (
  id bigserial primary key,
  user_id text not null references public.users(xata_id) on delete cascade,
  stripe_product_id text not null,
  stripe_price_id text not null unique,
  currency text not null,
  unit_amount integer not null,
  type text not null, -- 'one_time' or 'recurring'
  interval text default null,
  interval_count integer default null,
  active boolean default true,
  created_at timestamptz default now()
);

