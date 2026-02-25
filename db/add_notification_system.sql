-- Notification System Migration
-- Enhances existing notifications table, creates notification_preferences, email_queue, email_unsubscribe_tokens
-- All statements are idempotent (safe to re-run)

-- ============================================================
-- 1. Enhance existing notifications table
-- ============================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_message_id VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Backfill category from existing type values
UPDATE notifications SET category = CASE
  WHEN type IN ('task_assigned', 'task_offered', 'task_accepted', 'task_declined',
                'task_cancelled', 'task_expired', 'task_offer_expired', 'task_auto_hidden',
                'task_match', 'task_completed') THEN 'tasks'
  WHEN type IN ('proof_submitted', 'proof_approved', 'proof_rejected',
                'review_reminder') THEN 'tasks'
  WHEN type IN ('dispute', 'dispute_opened', 'dispute_filed', 'dispute_created',
                'dispute_resolved') THEN 'disputes'
  WHEN type IN ('payment_released', 'payment_received', 'payment_failed',
                'payment_pending', 'transfer_failed', 'payout_failed',
                'payout_completed', 'deposit_confirmed') THEN 'payments'
  WHEN type IN ('new_message') THEN 'messages'
  WHEN type IN ('rating_received', 'rating_visible') THEN 'reviews'
  ELSE 'system'
END
WHERE category IS NULL;

-- Backfill action_url from existing link column
UPDATE notifications SET action_url = link WHERE action_url IS NULL AND link IS NOT NULL;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc ON notifications(user_id, created_at DESC);

-- ============================================================
-- 2. Notification preferences table
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- ============================================================
-- 3. Email queue table
-- ============================================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'batched', 'expired')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  batch_key VARCHAR(255),
  batch_until TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  resend_message_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_queue(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_batch ON email_queue(batch_key, status)
  WHERE status = 'batched';
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue(user_id);

-- ============================================================
-- 4. Email unsubscribe tokens table
-- ============================================================

CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  event_type VARCHAR(100),  -- NULL means unsubscribe from all
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unsub_token ON email_unsubscribe_tokens(token);
