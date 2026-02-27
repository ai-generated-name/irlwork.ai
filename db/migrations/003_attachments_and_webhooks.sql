-- 003_attachments_and_webhooks.sql
-- Message attachments, instructions attachments, and webhook retry queue
-- Idempotent: safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- P3-5: Message attachments
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- P3-6: Instructions attachments (reference files for task instructions)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS instructions_attachments JSONB DEFAULT '[]';

-- P3-10: Webhook retry queue
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, delivered, failed, exhausted
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries(status, next_retry_at)
  WHERE status IN ('pending', 'failed');
