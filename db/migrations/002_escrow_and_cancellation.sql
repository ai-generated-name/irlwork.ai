-- 002_escrow_and_cancellation.sql
-- Payment timing refactor: auth-hold model, revision system, reputation tracking
-- Idempotent: safe to run multiple times (IF NOT EXISTS / COALESCE)

-- Task columns for auth-hold escrow model
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escrow_captured BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escrow_captured_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auth_hold_expires_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_warning_sent BOOLEAN DEFAULT FALSE;

-- Worker/agent reputation columns (NEW — these do not exist yet)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_rejections INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_disputes_lost INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_posted INTEGER DEFAULT 0;

-- NOTE: The following reputation columns ALREADY EXIST (from db/add_reputation_metrics_v2.sql)
-- and must NOT be re-added:
--   total_tasks_completed INTEGER DEFAULT 0  (incremented in releasePaymentToPending via increment_user_stat RPC)
--   total_tasks_accepted INTEGER DEFAULT 0   (incremented at accept, server.js lines 7237-7249, 7282-7294)
--   total_disputes_filed INTEGER DEFAULT 0   (incremented at POST /api/disputes, server.js lines 7593-7605)
--   jobs_completed INTEGER DEFAULT 0         (incremented in releasePaymentToPending via increment_user_stat RPC)

-- Backfill: existing in-progress+ tasks already have captured escrow
UPDATE tasks SET escrow_captured = TRUE
WHERE status IN ('in_progress','pending_review','approved','completed','paid','disputed')
  AND stripe_payment_intent_id IS NOT NULL
  AND (escrow_captured IS NULL OR escrow_captured = FALSE);

-- Backfill: total_cancellations for agents (tasks cancelled after a human was assigned)
UPDATE users SET total_cancellations = COALESCE(sub.cnt, 0)
FROM (
  SELECT agent_id, COUNT(*) as cnt
  FROM tasks
  WHERE status = 'cancelled'
    AND human_id IS NOT NULL
  GROUP BY agent_id
) sub
WHERE users.id = sub.agent_id
  AND users.total_cancellations = 0;

-- Backfill: total_rejections for humans (from task_proofs with status='rejected')
UPDATE users SET total_rejections = COALESCE(sub.cnt, 0)
FROM (
  SELECT tp.human_id, COUNT(*) as cnt
  FROM task_proofs tp
  WHERE tp.status = 'rejected'
  GROUP BY tp.human_id
) sub
WHERE users.id = sub.human_id
  AND users.total_rejections = 0;

-- Backfill: total_tasks_posted for agents
UPDATE users SET total_tasks_posted = COALESCE(sub.cnt, 0)
FROM (
  SELECT agent_id, COUNT(*) as cnt
  FROM tasks
  GROUP BY agent_id
) sub
WHERE users.id = sub.agent_id
  AND users.total_tasks_posted = 0;

-- Backfill: total_disputes_lost (from resolved disputes)
-- cancelled after dispute = agent won (human lost), paid after dispute = human won (agent lost)
UPDATE users SET total_disputes_lost = COALESCE(sub.cnt, 0)
FROM (
  SELECT loser_id, COUNT(*) as cnt FROM (
    SELECT d.filed_against as loser_id
    FROM disputes d
    JOIN tasks t ON d.task_id = t.id
    WHERE d.status = 'resolved' AND t.status = 'cancelled'
    UNION ALL
    SELECT d.filed_by as loser_id
    FROM disputes d
    JOIN tasks t ON d.task_id = t.id
    WHERE d.status = 'resolved' AND t.status = 'paid'
  ) losses
  GROUP BY loser_id
) sub
WHERE users.id = sub.loser_id
  AND users.total_disputes_lost = 0;

-- Status enum constraint (safety net)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'valid_task_status' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT valid_task_status
    CHECK (status IN (
      'open','pending_acceptance','assigned','in_progress',
      'pending_review','approved','disputed','paid','expired','cancelled'
    ));
  END IF;
END $$;

-- Status transition trigger (DB-level safety net)
CREATE OR REPLACE FUNCTION validate_task_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    (OLD.status = 'open' AND NEW.status IN ('pending_acceptance','assigned','expired','cancelled')) OR
    (OLD.status = 'pending_acceptance' AND NEW.status IN ('assigned','open','cancelled')) OR
    (OLD.status = 'assigned' AND NEW.status IN ('in_progress','cancelled')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('pending_review','disputed')) OR
    (OLD.status = 'pending_review' AND NEW.status IN ('approved','in_progress','disputed')) OR
    (OLD.status = 'approved' AND NEW.status IN ('paid')) OR
    (OLD.status = 'disputed' AND NEW.status IN ('approved','cancelled','paid'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_task_status_transition ON tasks;
CREATE TRIGGER enforce_task_status_transition
BEFORE UPDATE OF status ON tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION validate_task_status_transition();
