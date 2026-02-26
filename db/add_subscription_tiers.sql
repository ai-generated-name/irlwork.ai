-- Migration: Add subscription tiers system
-- Adds subscriptions table, tier columns to users, fee tracking to tasks

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free',
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_service_only" ON subscriptions FOR ALL USING (true);

-- 2. Add tier columns to users table (denormalized for fast lookups)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tasks_posted_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tasks_posted_month_reset TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- 3. Add fee tracking columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS poster_fee_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS poster_fee_cents INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS worker_fee_percent DECIMAL(5,2) DEFAULT 15;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_charge_cents INTEGER;

-- 4. Backfill existing users to free tier
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;
UPDATE users SET tasks_posted_this_month = 0 WHERE tasks_posted_this_month IS NULL;
