-- Add onboarding_completed_at column to users table
-- Run this in Supabase SQL Editor

-- Add the column
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill existing users who have completed onboarding
-- Set onboarding_completed_at to their updated_at timestamp
UPDATE users
SET onboarding_completed_at = updated_at
WHERE needs_onboarding = false AND city IS NOT NULL AND onboarding_completed_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'onboarding_completed_at';
