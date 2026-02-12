-- Migration: Rename total_usdc_paid → total_paid
-- USDC payment rail has been removed; this column now tracks total USD paid via Stripe.
-- Run this AFTER deploying the code changes that reference 'total_paid' instead of 'total_usdc_paid'.

-- Step 1: Rename the column
ALTER TABLE users RENAME COLUMN total_usdc_paid TO total_paid;

-- Step 2: Update the increment_user_stat RPC to work with the new column name.
-- If you have a stored procedure that references 'total_usdc_paid' by name,
-- it will need to be updated separately (Supabase RPC functions use dynamic column names,
-- so the stat_name parameter 'total_paid' should just work automatically).

-- Verification: Run this after migration to confirm
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_paid';
