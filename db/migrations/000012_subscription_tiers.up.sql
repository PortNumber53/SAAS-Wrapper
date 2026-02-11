-- Subscription tiers definition
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  max_integrations INTEGER NOT NULL DEFAULT 1,
  max_api_calls INTEGER NOT NULL DEFAULT 100,
  max_storage_mb INTEGER NOT NULL DEFAULT 100,
  features JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  deprecated_by TEXT REFERENCES public.subscription_tiers(id),
  grace_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User subscriptions (links a user to their active tier)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Migration jobs for price changes
CREATE TABLE IF NOT EXISTS public.tier_migration_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  old_tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  new_tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  grace_end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  users_migrated INTEGER DEFAULT 0,
  users_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Seed default tiers
INSERT INTO public.subscription_tiers (name, slug, price_cents, currency, max_integrations, max_api_calls, max_storage_mb, sort_order, features)
VALUES
  ('Free', 'free', 0, 'usd', 1, 100, 100, 0, '["1 integration", "100 API calls/mo", "100MB storage"]'),
  ('Pro', 'pro', 1999, 'usd', 5, 5000, 5120, 1, '["5 integrations", "5,000 API calls/mo", "5GB storage", "Priority support"]'),
  ('Business', 'business', 4999, 'usd', -1, 50000, 51200, 2, '["Unlimited integrations", "50,000 API calls/mo", "50GB storage", "Priority support", "Custom branding"]')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_subs_user ON public.user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_stripe ON public.user_subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tier_migrations_status ON public.tier_migration_jobs (status, grace_end_at);
