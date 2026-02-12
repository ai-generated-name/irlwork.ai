-- Add required_skills column to tasks table
-- Allows agents to specify what skills are needed for a task
-- Humans can then filter tasks by their skills

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]';

-- Index for GIN-based containment queries (e.g. find tasks matching a human's skills)
CREATE INDEX IF NOT EXISTS idx_tasks_required_skills ON tasks USING GIN (required_skills);
