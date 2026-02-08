-- Add Reputation Metrics to Users Table
-- Run this in Supabase SQL Editor for existing databases

ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_posted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_accepted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_disputes_filed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_usdc_paid NUMERIC(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_total_tasks_completed ON users(total_tasks_completed);

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
SET last_active_at = updated_at
WHERE last_active_at IS NULL;
