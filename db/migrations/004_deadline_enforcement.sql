-- 004_deadline_enforcement.sql
-- Deadline enforcement: extension requests, late proof tracking, tiered warnings
-- Idempotent — safe to run multiple times

-- 2a. New table: deadline_extension_requests
CREATE TABLE IF NOT EXISTS deadline_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  proposed_deadline TIMESTAMPTZ NOT NULL,
  original_deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'modified')),
  responded_by UUID REFERENCES profiles(id),
  response_note TEXT,
  final_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_extension_requests_task
  ON deadline_extension_requests(task_id);

-- Partial unique index: only one pending request per task at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_task
  ON deadline_extension_requests(task_id) WHERE status = 'pending';

-- 2b. Add submitted_late to task_proofs
ALTER TABLE task_proofs ADD COLUMN IF NOT EXISTS submitted_late BOOLEAN DEFAULT FALSE;

-- 2c. Convert deadline_warning_sent from BOOLEAN to INTEGER (0-4 tiers)
-- Using DO block for idempotency — only converts if still boolean type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
      AND column_name = 'deadline_warning_sent'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE tasks
      ALTER COLUMN deadline_warning_sent TYPE INTEGER
      USING CASE WHEN deadline_warning_sent THEN 1 ELSE 0 END;
    ALTER TABLE tasks ALTER COLUMN deadline_warning_sent SET DEFAULT 0;
  END IF;
END $$;
