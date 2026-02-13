-- Add metadata column to feedback table for structured error context
-- Used by agent error reporting (report_error MCP command) to store:
--   action, error_code, error_log, task_id, sdk_version, etc.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
