-- Migration 004: Enforce task status transitions at the database level
-- This is a safety net — application code validates transitions first,
-- but this trigger prevents any bypass (direct SQL, RPC, etc.)

CREATE OR REPLACE FUNCTION validate_task_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "open": ["pending_acceptance", "assigned", "expired", "cancelled"],
    "pending_acceptance": ["assigned", "open", "cancelled"],
    "assigned": ["in_progress", "cancelled", "open"],
    "in_progress": ["pending_review", "disputed", "open"],
    "pending_review": ["approved", "in_progress", "disputed"],
    "approved": ["paid"],
    "disputed": ["approved", "cancelled", "paid", "pending_review"],
    "paid": [],
    "expired": [],
    "cancelled": []
  }'::jsonb;
  allowed jsonb;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed := valid_transitions -> OLD.status;

  IF allowed IS NULL OR NOT allowed ? NEW.status THEN
    RAISE EXCEPTION 'Invalid task status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS enforce_task_status_transition ON tasks;

CREATE TRIGGER enforce_task_status_transition
  BEFORE UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_status_transition();
