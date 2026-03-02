-- Circle Programmable Wallets migration
-- Adds per-user Circle wallets, USDC balance columns, default payment method,
-- Circle transaction tracking on tasks, and a USDC deposit + ledger table.

-- ============================================================================
-- users table: Circle wallet + balance columns
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS circle_wallet_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS circle_wallet_address VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS usdc_available_balance NUMERIC(18,6) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usdc_escrow_balance NUMERIC(18,6) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_payment_method VARCHAR(20) DEFAULT 'stripe';

CREATE INDEX IF NOT EXISTS idx_users_circle_wallet_id
  ON users(circle_wallet_id) WHERE circle_wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_circle_wallet_address
  ON users(circle_wallet_address) WHERE circle_wallet_address IS NOT NULL;

-- ============================================================================
-- tasks table: Circle transaction tracking
-- ============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS circle_escrow_tx_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS circle_payout_tx_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS circle_refund_tx_id TEXT;

-- ============================================================================
-- usdc_deposits: tracks inbound deposits detected via Circle webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS usdc_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  circle_wallet_id TEXT NOT NULL,
  circle_transaction_id TEXT UNIQUE NOT NULL,
  tx_hash VARCHAR(128),
  amount NUMERIC(18,6) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, failed
  source_address VARCHAR(42),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usdc_deposits_user
  ON usdc_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_usdc_deposits_circle_tx
  ON usdc_deposits(circle_transaction_id);

-- ============================================================================
-- usdc_ledger: full audit trail for every USDC balance change
-- ============================================================================

CREATE TABLE IF NOT EXISTS usdc_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  task_id UUID REFERENCES tasks(id),
  type VARCHAR(30) NOT NULL,  -- deposit, escrow_lock, escrow_release, payout, withdrawal, refund, platform_fee
  amount NUMERIC(18,6) NOT NULL,  -- positive = credit, negative = debit
  balance_after NUMERIC(18,6) NOT NULL,
  escrow_balance_after NUMERIC(18,6),
  circle_transaction_id TEXT,
  tx_hash VARCHAR(128),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usdc_ledger_user
  ON usdc_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_usdc_ledger_task
  ON usdc_ledger(task_id);
