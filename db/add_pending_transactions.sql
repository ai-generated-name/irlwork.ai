-- Migration: Add pending_transactions table for 48-hour dispute window
-- This table tracks payments that have been released but are not yet available for withdrawal

CREATE TABLE IF NOT EXISTS pending_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'frozen', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clears_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cleared_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_pending_tx_status ON pending_transactions(status, clears_at);
CREATE INDEX idx_pending_tx_user ON pending_transactions(user_id);
CREATE INDEX idx_pending_tx_task ON pending_transactions(task_id);
CREATE INDEX idx_pending_tx_created ON pending_transactions(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE pending_transactions IS 'Tracks payments with 48-hour dispute window before funds become available for withdrawal';
COMMENT ON COLUMN pending_transactions.status IS 'pending: waiting for dispute window | available: ready to withdraw | frozen: dispute raised | withdrawn: already withdrawn';
COMMENT ON COLUMN pending_transactions.clears_at IS 'When the transaction will become available (created_at + 48 hours)';
COMMENT ON COLUMN pending_transactions.amount_cents IS 'Amount in cents (e.g., 5000 = $50.00)';
