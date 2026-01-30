-- Stripe events table for webhook snapshots
create table if not exists public.stripe_events (
  id bigserial primary key,
  event_id text not null unique,
  event_type text not null,
  customer_id text,
  subscription_id text,
  payment_intent_id text,
  amount integer default 0,
  currency text default 'usd',
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null,
  processed_at timestamptz default now()
);

create index if not exists idx_stripe_events_customer on public.stripe_events (customer_id);
create index if not exists idx_stripe_events_type on public.stripe_events (event_type);
create index if not exists idx_stripe_events_created on public.stripe_events (created_at desc);
