-- Phase 1 Manual Payments Migration
-- This migration adds support for manual escrow/payment operations

-- ============================================================================
-- PART 1: Add new escrow_status values
-- ============================================================================
-- Note: If escrow_status is a VARCHAR column, these ALTER TYPE commands will fail
-- In that case, just ensure the backend validates against allowed values

-- Try to add new values to escrow_status enum (will error if already exists or not an enum)
DO $$
BEGIN
  -- Add 'awaiting_worker' if not exists
  BEGIN
    ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'awaiting_worker';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add awaiting_worker to escrow_status enum (may be VARCHAR or already exists)';
  END;

  -- Add 'pending_deposit' if not exists
  BEGIN
    ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'pending_deposit';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add pending_deposit to escrow_status enum (may be VARCHAR or already exists)';
  END;

  -- Add 'withdrawn' if not exists
  BEGIN
    ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'withdrawn';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add withdrawn to escrow_status enum (may be VARCHAR or already exists)';
  END;
END $$;

-- ============================================================================
-- PART 2: Add new task status 'approved'
-- ============================================================================
-- This is an intermediate status between pending_review and paid
-- pending_review -> approved (agent approved) -> paid (admin released payment)

DO $$
BEGIN
  -- Add 'approved' to task_status enum if it exists
  BEGIN
    ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'approved';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add approved to task_status enum (may be VARCHAR or already exists)';
  END;
END $$;

-- ============================================================================
-- PART 3: Add columns to tasks table for Phase 1 workflow
-- ============================================================================

-- Add work_started_at timestamp (set when admin confirms deposit)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ;

-- Add deposit_amount field to store the unique deposit amount for matching
-- This is now generated when worker is approved, not at task creation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER;

-- ============================================================================
-- PART 4: Create manual_payments table
-- ============================================================================
-- Single source of truth for the full payment trail
-- Created at confirm-deposit, updated through lifecycle

CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  worker_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES users(id) NOT NULL,

  -- Deposit info (set at confirm-deposit)
  expected_amount DECIMAL(12,2) NOT NULL,
  deposit_amount DECIMAL(12,2),           -- Actual amount received
  deposit_tx_hash TEXT,
  deposit_status TEXT DEFAULT 'pending',  -- pending, confirmed, mismatched
  deposit_notes TEXT,                     -- Admin notes for mismatched deposits

  -- Release info (calculated server-side at release)
  worker_amount DECIMAL(12,2),            -- deposit_amount * 0.90
  platform_fee DECIMAL(12,2),             -- deposit_amount * 0.10

  -- Withdrawal/refund info
  withdrawal_tx_hash TEXT,
  refund_tx_hash TEXT,
  refund_reason TEXT,

  -- Status: pending_deposit -> deposited -> released -> pending_withdrawal -> withdrawn | refunded
  status TEXT NOT NULL DEFAULT 'pending_deposit',

  -- Timestamps
  deposit_confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);
CREATE INDEX IF NOT EXISTS idx_manual_payments_task ON manual_payments(task_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_worker ON manual_payments(worker_id);

-- ============================================================================
-- PART 5: Create admin_audit_log table
-- ============================================================================
-- Logs all admin actions for accountability and debugging

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  payment_id UUID REFERENCES manual_payments(id),
  request_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for querying by task
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_task ON admin_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- ============================================================================
-- PART 6: Enable RLS on new tables
-- ============================================================================

ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- manual_payments policies
-- Only admins and involved parties can see payment records
CREATE POLICY "manual_payments_select_policy" ON manual_payments
  FOR SELECT USING (
    auth.uid() = worker_id OR
    auth.uid() = agent_id OR
    auth.uid() IN (SELECT id FROM users WHERE type = 'admin')
  );

-- Only service role (backend) can insert/update
CREATE POLICY "manual_payments_insert_policy" ON manual_payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "manual_payments_update_policy" ON manual_payments
  FOR UPDATE USING (true);

-- admin_audit_log policies
-- Only admins can see audit logs
CREATE POLICY "admin_audit_log_select_policy" ON admin_audit_log
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE type = 'admin')
  );

-- Only service role (backend) can insert
CREATE POLICY "admin_audit_log_insert_policy" ON admin_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify migration)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name IN ('work_started_at', 'deposit_amount_cents');
-- SELECT * FROM information_schema.tables WHERE table_name IN ('manual_payments', 'admin_audit_log');
-- \d manual_payments
-- \d admin_audit_log
