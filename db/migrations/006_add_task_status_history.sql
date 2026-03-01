-- Migration: Add task_status_history table for full audit trail
-- Every task status transition is recorded here for agent session context

CREATE TABLE IF NOT EXISTS task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_status_history_task
  ON task_status_history(task_id, created_at);

CREATE INDEX IF NOT EXISTS idx_task_status_history_task_status
  ON task_status_history(task_id, to_status);

-- RLS policies
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- Agents can read history for tasks they created
CREATE POLICY "Agents can view status history for own tasks"
  ON task_status_history FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE agent_id = auth.uid())
  );

-- Workers can read history for tasks they're assigned to
CREATE POLICY "Workers can view status history for assigned tasks"
  ON task_status_history FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE human_id = auth.uid())
  );
