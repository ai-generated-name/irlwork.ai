-- Step-by-step migration with output messages
-- Run each section separately to see where it fails

-- STEP 1: Check if UUID extension exists
SELECT 'Checking UUID extension...' as status;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT 'UUID extension ready' as status;

-- STEP 2: Create payouts table
SELECT 'Creating payouts table...' as status;

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tx_hash VARCHAR(128) NOT NULL,
    amount_cents INTEGER NOT NULL,
    fee_cents INTEGER NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    dispute_window_closes_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Payouts table created' as status;

-- STEP 3: Create payouts indexes
SELECT 'Creating payouts indexes...' as status;

CREATE INDEX idx_payouts_task ON payouts(task_id);
CREATE INDEX idx_payouts_human ON payouts(human_id);
CREATE INDEX idx_payouts_tx ON payouts(tx_hash);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_dispute_window ON payouts(dispute_window_closes_at);

SELECT 'Payouts indexes created' as status;

-- STEP 4: Create disputes table
SELECT 'Creating disputes table...' as status;

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    payout_id UUID REFERENCES payouts(id) ON DELETE CASCADE,
    filed_by UUID REFERENCES users(id) ON DELETE CASCADE,
    filed_against UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    evidence_urls TEXT[],
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT 'Disputes table created' as status;

-- STEP 5: Create disputes indexes
SELECT 'Creating disputes indexes...' as status;

CREATE INDEX idx_disputes_task ON disputes(task_id);
CREATE INDEX idx_disputes_payout ON disputes(payout_id);
CREATE INDEX idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX idx_disputes_filed_against ON disputes(filed_against);
CREATE INDEX idx_disputes_status ON disputes(status);

SELECT 'Disputes indexes created' as status;

-- STEP 6: Verify tables exist
SELECT 'Verifying tables...' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('payouts', 'disputes');

SELECT 'Migration complete!' as status;
