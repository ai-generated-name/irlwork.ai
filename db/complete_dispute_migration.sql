-- irlwork.ai Complete Dispute System Migration
-- Run this in Supabase SQL Editor
-- This creates both payouts and disputes tables with all required fields

-- ============================================
-- PAYOUTS TABLE (with dispute window support)
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
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

-- Indexes for payouts
CREATE INDEX IF NOT EXISTS idx_payouts_task ON payouts(task_id);
CREATE INDEX IF NOT EXISTS idx_payouts_human ON payouts(human_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tx ON payouts(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_dispute_window ON payouts(dispute_window_closes_at);

-- ============================================
-- DISPUTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS disputes (
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

-- Indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_task ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_payout ON disputes(payout_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_against ON disputes(filed_against);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ============================================
-- TRIGGERS
-- ============================================
-- Add updated_at trigger for disputes (only if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
        CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (Optional - for production)
-- ============================================
-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Payout policies: Users can only see their own payouts
DROP POLICY IF EXISTS payouts_view_policy ON payouts;
CREATE POLICY payouts_view_policy ON payouts
    FOR SELECT
    USING (auth.uid() = human_id);

-- Dispute policies: Users can view disputes they're involved in
DROP POLICY IF EXISTS disputes_view_policy ON disputes;
CREATE POLICY disputes_view_policy ON disputes
    FOR SELECT
    USING (
        auth.uid() = filed_by OR
        auth.uid() = filed_against
    );

-- Only the filer can create disputes
DROP POLICY IF EXISTS disputes_create_policy ON disputes;
CREATE POLICY disputes_create_policy ON disputes
    FOR INSERT
    WITH CHECK (auth.uid() = filed_by);
