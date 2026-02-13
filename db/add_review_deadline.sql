-- Add review_deadline column to tasks table
-- Used for the 24-hour acceptance window when an agent hires a human
-- The human has until review_deadline to accept or decline the offer
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ;

-- Index for the cron job that expires pending_acceptance tasks
CREATE INDEX IF NOT EXISTS idx_tasks_pending_acceptance_review
  ON tasks (review_deadline)
  WHERE status = 'pending_acceptance' AND review_deadline IS NOT NULL;
