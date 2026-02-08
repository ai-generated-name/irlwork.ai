-- irlwork.ai Dispute System Migration
-- Run this in Supabase SQL Editor

-- Step 1: Update payouts table to add dispute window fields
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dispute_window_closes_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_dispute_window ON payouts(dispute_window_closes_at);

-- Step 2: Create disputes table
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

-- Step 3: Create indexes for disputes table
CREATE INDEX IF NOT EXISTS idx_disputes_task ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_payout ON disputes(payout_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_against ON disputes(filed_against);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Step 4: Add updated_at trigger for disputes
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable RLS on disputes table (optional but recommended)
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for disputes
-- Policy: Users can view disputes they're involved in
CREATE POLICY disputes_view_policy ON disputes
    FOR SELECT
    USING (
        auth.uid() = filed_by OR
        auth.uid() = filed_against OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

-- Policy: Only agents can create disputes
CREATE POLICY disputes_create_policy ON disputes
    FOR INSERT
    WITH CHECK (
        auth.uid() = filed_by AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND type = 'agent'
        )
    );

-- Policy: Only admins can update disputes (for resolution)
CREATE POLICY disputes_update_policy ON disputes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );
