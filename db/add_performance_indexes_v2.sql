-- Migration: Additional performance indexes v2
-- Targets columns used in background jobs, dashboard queries, and notification lookups.

-- Notifications: listing unread per user (dashboard badge + notification list)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Pending transactions: balance promoter + worker wallet queries
CREATE INDEX IF NOT EXISTS idx_pending_transactions_user_status
  ON pending_transactions(user_id, status);

-- Tasks: in_progress deadline check (Rule 5 cron — auto-cancel on missed deadline)
CREATE INDEX IF NOT EXISTS idx_tasks_in_progress_deadline
  ON tasks(deadline) WHERE status = 'in_progress';

-- Task applications: listing per task by status (agent reviewing applicants)
CREATE INDEX IF NOT EXISTS idx_task_applications_task_status
  ON task_applications(task_id, status);

-- Task applications: expiry cron (Rule 6)
CREATE INDEX IF NOT EXISTS idx_task_applications_expiry
  ON task_applications(expires_at) WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Users: idle account cleanup cron
CREATE INDEX IF NOT EXISTS idx_users_last_active_at
  ON users(last_active_at) WHERE last_active_at IS NOT NULL;

-- Webhook deliveries: retry processor
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON webhook_deliveries(status, next_retry_at)
  WHERE status IN ('failed', 'pending');

-- Task drafts: agent draft listing
CREATE INDEX IF NOT EXISTS idx_task_drafts_agent_updated
  ON task_drafts(agent_id, updated_at DESC);
