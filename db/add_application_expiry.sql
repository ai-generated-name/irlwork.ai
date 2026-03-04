-- Migration: Application expiry
-- Pending task applications expire after 14 days if the agent hasn't responded.
-- Keeps worker dashboards clean and signals agents are non-responsive.

ALTER TABLE task_applications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Back-fill expiry for existing pending applications
UPDATE task_applications
  SET expires_at = created_at + INTERVAL '14 days'
  WHERE status = 'pending' AND expires_at IS NULL;

-- Partial index for the cron job that expires old applications
CREATE INDEX IF NOT EXISTS idx_task_applications_expiry
  ON task_applications(expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

COMMENT ON COLUMN task_applications.expires_at IS
  'When this pending application expires. NULL = no expiry. Auto-set to created_at + 14 days on insert.';
