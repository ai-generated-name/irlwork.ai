-- ROLLBACK: No down migration. To rollback: DROP TABLE IF EXISTS task_validation_log;
-- This deletes all validation audit history. Manual SQL required.

-- Task Validation Log: log every validation attempt for debugging and abuse detection.

CREATE TABLE IF NOT EXISTS task_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID,
  task_type_id VARCHAR(50),
  payload_hash VARCHAR(64),                         -- SHA-256 hash of submitted payload for dedup
  validation_result VARCHAR(20) NOT NULL             -- 'passed', 'failed', 'flagged_for_review'
    CHECK (validation_result IN ('passed', 'failed', 'flagged_for_review')),
  errors JSONB DEFAULT '[]',                         -- array of error objects
  policy_flags JSONB DEFAULT '[]',                   -- any policy violations detected
  attempt_number INTEGER DEFAULT 1,
  dry_run BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_validation_log_agent ON task_validation_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_validation_log_created ON task_validation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_validation_log_result ON task_validation_log(validation_result);
CREATE INDEX IF NOT EXISTS idx_task_validation_log_hash ON task_validation_log(payload_hash);
