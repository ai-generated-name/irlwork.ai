-- Migration: Add withdrawals table for tracking withdrawal history

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  wallet_address VARCHAR(64) NOT NULL,
  tx_hash VARCHAR(128),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_ids UUID[], -- Array of pending_transaction IDs that were withdrawn
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_created ON withdrawals(created_at DESC);
CREATE INDEX idx_withdrawals_tx_hash ON withdrawals(tx_hash);

-- Add comment for documentation
COMMENT ON TABLE withdrawals IS 'Tracks worker withdrawals from available balance to their wallet';
COMMENT ON COLUMN withdrawals.amount_cents IS 'Amount withdrawn in cents (e.g., 5000 = $50.00)';
COMMENT ON COLUMN withdrawals.transaction_ids IS 'Array of pending_transaction IDs that were withdrawn in this batch';
