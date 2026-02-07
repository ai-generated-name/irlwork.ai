-- Migration: Add 48-hour auto-release mechanism
-- Run this in Supabase SQL Editor

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_released BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of stale tasks
CREATE INDEX IF NOT EXISTS idx_tasks_pending_review
  ON tasks(status, proof_submitted_at)
  WHERE status = 'pending_review';

-- Update existing tasks in pending_review to have proof_submitted_at set
-- (optional - only if you want to enable auto-release for existing pending tasks)
-- Comment out if you only want this for new submissions
UPDATE tasks
SET proof_submitted_at = updated_at
WHERE status = 'pending_review'
  AND proof_submitted_at IS NULL;

-- Verify the changes
SELECT
  COUNT(*) as pending_review_count,
  COUNT(proof_submitted_at) as with_timestamp_count,
  COUNT(*) FILTER (WHERE auto_released = true) as auto_released_count
FROM tasks
WHERE status = 'pending_review';
