-- 004_allow_withdrawal_transitions.sql
-- Fix: Worker withdrawal sets task status back to 'open' from assigned/in_progress,
-- but the DB trigger blocks these transitions. Add them to allow worker withdrawal.
-- Idempotent: CREATE OR REPLACE.

-- Update the status transition trigger to allow withdrawal transitions
CREATE OR REPLACE FUNCTION validate_task_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    (OLD.status = 'open' AND NEW.status IN ('pending_acceptance','assigned','expired','cancelled')) OR
    (OLD.status = 'pending_acceptance' AND NEW.status IN ('assigned','open','cancelled')) OR
    (OLD.status = 'assigned' AND NEW.status IN ('in_progress','cancelled','open')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('pending_review','disputed','open')) OR
    (OLD.status = 'pending_review' AND NEW.status IN ('approved','in_progress','disputed')) OR
    (OLD.status = 'approved' AND NEW.status IN ('paid')) OR
    (OLD.status = 'disputed' AND NEW.status IN ('approved','cancelled','paid'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
