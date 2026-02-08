-- Fix Dispute System Migration
-- This will drop and recreate tables to ensure correct schema

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;

-- Create payouts table
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

CREATE INDEX idx_payouts_task ON payouts(task_id);
CREATE INDEX idx_payouts_human ON payouts(human_id);
CREATE INDEX idx_payouts_tx ON payouts(tx_hash);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_dispute_window ON payouts(dispute_window_closes_at);

-- Create disputes table
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

CREATE INDEX idx_disputes_task ON disputes(task_id);
CREATE INDEX idx_disputes_payout ON disputes(payout_id);
CREATE INDEX idx_disputes_filed_by ON disputes(filed_by);
CREATE INDEX idx_disputes_filed_against ON disputes(filed_against);
CREATE INDEX idx_disputes_status ON disputes(status);
