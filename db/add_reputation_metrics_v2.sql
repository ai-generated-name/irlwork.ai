-- Add Reputation Metrics to Users Table (No Trigger Disabling)
-- Run this in Supabase SQL Editor for existing databases

-- Step 1: Add updated_at column first (required by trigger)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Add reputation metric columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_posted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tasks_accepted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_disputes_filed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_usdc_paid NUMERIC(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_total_tasks_completed ON users(total_tasks_completed);

-- Step 4: Backfill total_tasks_posted for agents
DO $$
DECLARE
    agent_record RECORD;
    task_count INTEGER;
BEGIN
    FOR agent_record IN SELECT id FROM users WHERE type = 'agent'
    LOOP
        SELECT COUNT(*) INTO task_count
        FROM tasks
        WHERE agent_id = agent_record.id;

        UPDATE users
        SET total_tasks_posted = task_count
        WHERE id = agent_record.id;
    END LOOP;
END $$;

-- Step 5: Backfill total_tasks_accepted for humans
DO $$
DECLARE
    human_record RECORD;
    task_count INTEGER;
BEGIN
    FOR human_record IN SELECT id FROM users WHERE type = 'human'
    LOOP
        SELECT COUNT(*) INTO task_count
        FROM tasks
        WHERE human_id = human_record.id;

        UPDATE users
        SET total_tasks_accepted = task_count
        WHERE id = human_record.id;
    END LOOP;
END $$;

-- Step 6: Backfill total_tasks_completed for humans
DO $$
DECLARE
    human_record RECORD;
    completed_count INTEGER;
BEGIN
    FOR human_record IN SELECT id FROM users WHERE type = 'human'
    LOOP
        SELECT COUNT(*) INTO completed_count
        FROM tasks
        WHERE human_id = human_record.id
        AND status = 'completed';

        UPDATE users
        SET total_tasks_completed = completed_count
        WHERE id = human_record.id;
    END LOOP;
END $$;

-- Step 7: Backfill total_usdc_paid for agents
DO $$
DECLARE
    agent_record RECORD;
    total_paid NUMERIC;
BEGIN
    FOR agent_record IN SELECT id FROM users WHERE type = 'agent'
    LOOP
        SELECT COALESCE(SUM(p.amount_cents / 100.0), 0) INTO total_paid
        FROM payouts p
        JOIN tasks t ON t.id = p.task_id
        WHERE t.agent_id = agent_record.id
        AND p.status IN ('available', 'released', 'pending');

        UPDATE users
        SET total_usdc_paid = total_paid
        WHERE id = agent_record.id;
    END LOOP;
END $$;

-- Step 8: Backfill total_disputes_filed for agents
DO $$
DECLARE
    agent_record RECORD;
    dispute_count INTEGER;
BEGIN
    FOR agent_record IN SELECT id FROM users WHERE type = 'agent'
    LOOP
        SELECT COUNT(*) INTO dispute_count
        FROM disputes
        WHERE filed_by = agent_record.id;

        UPDATE users
        SET total_disputes_filed = dispute_count
        WHERE id = agent_record.id;
    END LOOP;
END $$;

-- Step 9: Set last_active_at for existing users
UPDATE users
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

-- Step 10: Verify migration
SELECT
    'Migration Complete ✓' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE type = 'agent') as agents,
    COUNT(*) FILTER (WHERE type = 'human') as humans,
    SUM(total_tasks_completed) as total_completed,
    SUM(total_tasks_posted) as total_posted,
    SUM(total_usdc_paid) as total_usd_paid
FROM users;
