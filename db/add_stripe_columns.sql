-- Stripe Connect Integration Migration
-- Adds columns for Stripe customers (agents), Connect accounts (workers),
-- payment tracking, and webhook idempotency.

-- ============================================================================
-- PART 1: Users table - Stripe identifiers
-- ============================================================================

-- stripe_account_id for workers' Connect accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
-- stripe_customer_id for agents (to store saved payment methods)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON users(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ============================================================================
-- PART 2: Tasks table - Stripe payment tracking
-- ============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'usdc';

CREATE INDEX IF NOT EXISTS idx_tasks_stripe_pi ON tasks(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- PART 3: Pending transactions - payout method tracking
-- ============================================================================

ALTER TABLE pending_transactions ADD COLUMN IF NOT EXISTS payout_method VARCHAR(20) DEFAULT 'usdc';
ALTER TABLE pending_transactions ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);

-- ============================================================================
-- PART 4: Withdrawals - support Stripe alongside USDC
-- ============================================================================

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_method VARCHAR(20) DEFAULT 'usdc';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);

-- ============================================================================
-- PART 5: Webhook idempotency table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id VARCHAR(255) PRIMARY KEY,  -- Stripe event ID (evt_...)
  type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Service role only (backend operations)
CREATE POLICY "stripe_events_service_only" ON stripe_events
  FOR ALL USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'stripe%';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name IN ('stripe_payment_intent_id', 'payment_method');
-- SELECT * FROM information_schema.tables WHERE table_name = 'stripe_events';
