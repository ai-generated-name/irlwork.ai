-- ROLLBACK: No down migration. To rollback, run each ALTER TABLE ... DROP COLUMN manually.
-- Dropping private_* columns destroys encrypted data that cannot be recovered without backup.

-- Add validation system columns to existing tasks table.
-- All nullable so existing tasks are unaffected.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type_id VARCHAR(50) REFERENCES task_type_registry(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_zone VARCHAR(200);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS private_address TEXT;      -- AES-256-GCM encrypted
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS private_notes TEXT;        -- AES-256-GCM encrypted
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS private_contact TEXT;      -- AES-256-GCM encrypted
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS validation_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_task_type_id ON tasks(task_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_location_zone ON tasks(location_zone);
