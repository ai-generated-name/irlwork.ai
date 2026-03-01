-- Migration 005: Add auto_approved column for the auto-approve timeout feature
-- Tasks in pending_review for >48 hours are auto-approved to protect workers.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;

-- Index for the auto-approve background job query
CREATE INDEX IF NOT EXISTS idx_tasks_auto_approve
  ON tasks (status, proof_submitted_at)
  WHERE status = 'pending_review';
