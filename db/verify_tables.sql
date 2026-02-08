-- Verify payouts table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payouts'
ORDER BY ordinal_position;

-- Verify disputes table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'disputes'
ORDER BY ordinal_position;

-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename IN ('payouts', 'disputes')
ORDER BY tablename, indexname;
