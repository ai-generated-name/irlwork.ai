-- Add Reputation Metrics to Users Table (Safe Version)
-- Run this in Supabase SQL Editor for existing databases

-- First, ensure updated_at column exists (needed by trigger)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add reputation metric columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_posted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_accepted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_disputes_filed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_usdc_paid NUMERIC(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_total_tasks_completed ON users(total_tasks_completed);

-- Temporarily disable the trigger to avoid conflicts during backfill
ALTER TABLE users DISABLE TRIGGER ALL;

-- Backfill existing data from tasks table
-- Update total_tasks_posted for agents
UPDATE users u
SET total_tasks_posted = (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.agent_id = u.id
)
WHERE u.type = 'agent';

-- Update total_tasks_accepted for humans
UPDATE users u
SET total_tasks_accepted = (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.human_id = u.id
)
WHERE u.type = 'human';

-- Update total_tasks_completed for humans (tasks with status 'completed')
UPDATE users u
SET total_tasks_completed = (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.human_id = u.id
    AND t.status = 'completed'
)
WHERE u.type = 'human';

-- Update total_usdc_paid for agents (sum of payouts)
UPDATE users u
SET total_usdc_paid = (
    SELECT COALESCE(SUM(p.amount_cents / 100.0), 0)
    FROM payouts p
    JOIN tasks t ON t.id = p.task_id
    WHERE t.agent_id = u.id
    AND p.status IN ('available', 'released')
)
WHERE u.type = 'agent';

-- Update total_disputes_filed for agents
UPDATE users u
SET total_disputes_filed = (
    SELECT COUNT(*)
    FROM disputes d
    WHERE d.filed_by = u.id
)
WHERE u.type = 'agent';

-- Set last_active_at to updated_at for existing users
UPDATE users
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

-- Re-enable triggers
ALTER TABLE users ENABLE TRIGGER ALL;

-- Verify the migration succeeded
SELECT
    'Migration Complete' as status,
    COUNT(*) as total_users,
    SUM(CASE WHEN type = 'agent' THEN 1 ELSE 0 END) as agents,
    SUM(CASE WHEN type = 'human' THEN 1 ELSE 0 END) as humans,
    SUM(total_tasks_completed) as total_completed_tasks,
    SUM(total_tasks_posted) as total_posted_tasks
FROM users;
