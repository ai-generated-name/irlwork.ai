-- Check existing table structures

-- Check payouts table columns
SELECT 'PAYOUTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payouts'
ORDER BY ordinal_position;

-- Check disputes table columns
SELECT 'DISPUTES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'disputes'
ORDER BY ordinal_position;

-- Check if payout_id exists in disputes
SELECT 'Checking if payout_id exists in disputes:' as info;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'disputes'
    AND column_name = 'payout_id'
) as payout_id_exists;

-- Check if dispute_window_closes_at exists in payouts
SELECT 'Checking if dispute_window_closes_at exists in payouts:' as info;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payouts'
    AND column_name = 'dispute_window_closes_at'
) as dispute_window_closes_at_exists;
