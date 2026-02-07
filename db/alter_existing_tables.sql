-- Alter existing tables to add missing columns
-- This is safe to run multiple times

-- Add missing columns to payouts if they don't exist
DO $$
BEGIN
    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'status'
    ) THEN
        ALTER TABLE payouts ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added status column to payouts';
    ELSE
        RAISE NOTICE 'status column already exists in payouts';
    END IF;

    -- Add dispute_window_closes_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'dispute_window_closes_at'
    ) THEN
        ALTER TABLE payouts ADD COLUMN dispute_window_closes_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added dispute_window_closes_at column to payouts';
    ELSE
        RAISE NOTICE 'dispute_window_closes_at column already exists in payouts';
    END IF;
END $$;

-- Add missing columns to disputes if they don't exist
DO $$
BEGIN
    -- Add payout_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'disputes' AND column_name = 'payout_id'
    ) THEN
        ALTER TABLE disputes ADD COLUMN payout_id UUID REFERENCES payouts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added payout_id column to disputes';
    ELSE
        RAISE NOTICE 'payout_id column already exists in disputes';
    END IF;

    -- Add evidence_urls column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'disputes' AND column_name = 'evidence_urls'
    ) THEN
        ALTER TABLE disputes ADD COLUMN evidence_urls TEXT[];
        RAISE NOTICE 'Added evidence_urls column to disputes';
    ELSE
        RAISE NOTICE 'evidence_urls column already exists in disputes';
    END IF;

    -- Add category column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'disputes' AND column_name = 'category'
    ) THEN
        ALTER TABLE disputes ADD COLUMN category VARCHAR(100);
        RAISE NOTICE 'Added category column to disputes';
    ELSE
        RAISE NOTICE 'category column already exists in disputes';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_dispute_window ON payouts(dispute_window_closes_at);
CREATE INDEX IF NOT EXISTS idx_disputes_payout ON disputes(payout_id);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);

-- Verify final structure
SELECT 'Payouts table columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payouts'
ORDER BY ordinal_position;

SELECT 'Disputes table columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'disputes'
ORDER BY ordinal_position;

SELECT 'Migration complete!' as status;
