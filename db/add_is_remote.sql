-- Add is_remote column to tasks table
-- Remote tasks are visible to all users regardless of location

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;

-- Index for efficient filtering of remote open tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_remote ON tasks(is_remote) WHERE status = 'open';

-- Backfill: tasks with no coordinates are likely remote
UPDATE tasks SET is_remote = true WHERE latitude IS NULL AND longitude IS NULL;
