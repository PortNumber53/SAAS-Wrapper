-- Platform subscription tiers (admin-managed, system-level)
create table if not exists public.subscription_tiers (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  description text default '',
  stripe_product_id text,
  stripe_price_id text,
  unit_amount integer default 0,
  currency text default 'usd',
  interval text default 'month',
  features jsonb default '[]'::jsonb,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User subscriptions (one active row per user)
create table if not exists public.user_subscriptions (
  id bigserial primary key,
  user_id text not null references public.users(id) on delete cascade,
  tier_id bigint not null references public.subscription_tiers(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_user_subscriptions_user
  on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_stripe_sub
  on public.user_subscriptions (stripe_subscription_id);
create index if not exists idx_user_subscriptions_stripe_customer
  on public.user_subscriptions (stripe_customer_id);

-- Price migration jobs
create table if not exists public.price_migration_jobs (
  id bigserial primary key,
  tier_id bigint not null references public.subscription_tiers(id),
  old_stripe_product_id text not null,
  old_stripe_price_id text not null,
  new_stripe_product_id text not null,
  new_stripe_price_id text not null,
  grace_period_days integer default 0,
  status text not null default 'pending',
  total_users integer default 0,
  migrated_users integer default 0,
  failed_users integer default 0,
  error_log text default '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Per-user migration tracking within a job
create table if not exists public.price_migration_items (
  id bigserial primary key,
  job_id bigint not null references public.price_migration_jobs(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  stripe_subscription_id text not null,
  status text not null default 'pending',
  error_message text default '',
  migrated_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_migration_items_job_status
  on public.price_migration_items (job_id, status);

-- Seed the three default tiers
insert into public.subscription_tiers (slug, name, description, sort_order, features)
values
  ('free', 'Free', 'Get started with basic features', 0, '["5 posts/month","1 social account"]'::jsonb),
  ('starter', 'Starter', 'For growing creators', 1, '["50 posts/month","5 social accounts","Analytics"]'::jsonb),
  ('pro', 'Pro', 'For professionals', 2, '["Unlimited posts","Unlimited accounts","Priority support","Advanced analytics"]'::jsonb)
on conflict (slug) do nothing;
