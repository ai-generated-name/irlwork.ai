-- Add Reputation Metrics to Users Table (Compatible with any schema)
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

-- Step 4: Initialize all counters to 0 for existing users
UPDATE users SET
    total_tasks_completed = 0,
    total_tasks_posted = 0,
    total_tasks_accepted = 0,
    total_disputes_filed = 0,
    total_usdc_paid = 0
WHERE total_tasks_completed IS NULL
   OR total_tasks_posted IS NULL
   OR total_tasks_accepted IS NULL;

-- Step 5: Set last_active_at for existing users
UPDATE users
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

-- Verification: Show current state
SELECT
    'Columns Added Successfully ✓' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE type = 'agent') as agents,
    COUNT(*) FILTER (WHERE type = 'human') as humans
FROM users;

-- Note: Backfill will happen automatically as users interact with the system.
-- If you need to backfill from existing data, please run the manual backfill queries below.
