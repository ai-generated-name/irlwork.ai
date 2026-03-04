-- Valid task status transitions — PostgreSQL trigger enforcement.
-- This is the single source of truth. Keep in sync with ARCHITECTURE.md.
-- Prevents invalid transitions from ALL code paths (REST, MCP, cron, manual SQL).

CREATE OR REPLACE FUNCTION enforce_task_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["open"],
    "open": ["pending_acceptance", "assigned", "cancelled", "expired"],
    "pending_acceptance": ["assigned", "open", "cancelled", "expired"],
    "assigned": ["in_progress", "open", "cancelled"],
    "in_progress": ["pending_review", "disputed", "cancelled", "open"],
    "pending_review": ["approved", "in_progress", "disputed"],
    "approved": ["paid"],
    "disputed": ["approved", "cancelled", "paid"],
    "paid": [],
    "cancelled": [],
    "expired": ["open"]
  }'::jsonb;
  allowed_targets jsonb;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Look up allowed transitions for current status
  allowed_targets := valid_transitions -> OLD.status;

  IF allowed_targets IS NULL THEN
    RAISE EXCEPTION 'Unknown task status: %', OLD.status;
  END IF;

  -- Check if new status is in the allowed list
  IF NOT allowed_targets ? NEW.status THEN
    RAISE EXCEPTION 'Invalid status transition: % -> % (allowed: %)',
      OLD.status, NEW.status, allowed_targets;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS check_task_status_transition ON tasks;

-- Create trigger
CREATE TRIGGER check_task_status_transition
  BEFORE UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_task_status_transition();

COMMENT ON FUNCTION enforce_task_status_transition() IS
  'Enforces valid task status transitions. Source of truth for allowed transitions. Keep in sync with ARCHITECTURE.md.';
