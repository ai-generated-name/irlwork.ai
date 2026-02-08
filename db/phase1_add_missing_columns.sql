-- Phase 1: Add missing columns to tasks table
-- Run this in Supabase SQL Editor

-- Add escrow_status column (TEXT for flexibility)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'awaiting_worker';

-- Add human_id column (single assigned worker)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS human_id UUID REFERENCES users(id);

-- Add unique_deposit_amount column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS unique_deposit_amount DECIMAL(12,2);

-- Add other escrow-related columns that may be missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escrow_deposited_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Create index for escrow_status queries
CREATE INDEX IF NOT EXISTS idx_tasks_escrow_status ON tasks(escrow_status);
CREATE INDEX IF NOT EXISTS idx_tasks_human_id ON tasks(human_id);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('escrow_status', 'human_id', 'unique_deposit_amount', 'escrow_deposited_at', 'escrow_released_at');
