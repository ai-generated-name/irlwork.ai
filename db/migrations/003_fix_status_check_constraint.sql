-- 003_fix_status_check_constraint.sql
-- Fix: tasks_status_check constraint is missing 'cancelled' (and other valid statuses)
-- This constraint was created outside of migrations and blocks task cancellation.
-- Idempotent: safe to run multiple times.

-- Drop the broken constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Re-add with all valid statuses from the state machine (ARCHITECTURE.md / VALID_STATUS_TRANSITIONS)
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
CHECK (status IN (
  'open',
  'pending_acceptance',
  'assigned',
  'in_progress',
  'pending_review',
  'approved',
  'completed',
  'rejected',
  'disputed',
  'paid',
  'refunded',
  'expired',
  'cancelled'
));
