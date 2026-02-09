-- irlwork.ai Supabase Migration
-- Run in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (humans + agents)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'human', -- 'human' or 'agent'
    api_key VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    hourly_rate DECIMAL(10,2) DEFAULT 25.00,
    account_type VARCHAR(50) DEFAULT 'human',
    
    -- Location
    city VARCHAR(100),
    state VARCHAR(10),
    zip VARCHAR(20),
    service_radius DECIMAL(10,2) DEFAULT 25.00,
    
    -- Professional
    professional_category VARCHAR(100),
    license_number VARCHAR(100),
    certification_url TEXT,
    insurance_provider VARCHAR(255),
    insurance_expiry TIMESTAMP,
    portfolio_url TEXT,
    
    -- Skills stored as JSONB
    skills JSONB DEFAULT '[]',

    -- Social profile links stored as JSONB
    social_links JSONB DEFAULT '{}',

    -- Profile
    profile_completeness DECIMAL(3,2) DEFAULT 0.20,
    availability VARCHAR(50) DEFAULT 'available',
    
    -- Reputation
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    
    -- Wallet (NEW - for payments)
    wallet_address VARCHAR(64),
    wallet_chain VARCHAR(20) DEFAULT 'base',
    
    -- Stripe
    stripe_account_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_skills ON users USING GIN (skills);
CREATE INDEX idx_users_availability ON users(availability);
CREATE INDEX idx_users_verified ON users(verified);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- ============================================
-- USER CATEGORIES
-- ============================================
CREATE TABLE user_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(100) NOT NULL,
    is_professional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

CREATE INDEX idx_user_categories_user ON user_categories(user_id);

-- ============================================
-- CERTIFICATIONS
-- ============================================
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    document_url TEXT,
    license_number VARCHAR(100),
    issuer VARCHAR(255),
    expiry_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    verified_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_certifications_status ON certifications(status);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Task Details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    location TEXT,
    
    -- Budget & Payment (NEW)
    budget_type VARCHAR(50), -- 'hourly', 'fixed'
    budget_cents INTEGER NOT NULL, -- What worker receives (e.g., 5000 = $50.00)
    deposit_amount_cents INTEGER NOT NULL, -- Unique amount for matching (e.g., 5047)
    
    -- Duration
    duration_hours DECIMAL(5,2),
    
    -- Status
    urgency VARCHAR(50) DEFAULT 'scheduled',
    insurance_option VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'hired', 'assigned', 'in_progress', 'completed', 'cancelled'
    
    -- Escrow Status (NEW)
    escrow_status VARCHAR(50) DEFAULT 'unfunded', -- 'unfunded', 'funded', 'released', 'refunded'
    escrow_tx_hash VARCHAR(128),
    payout_tx_hash VARCHAR(128),
    platform_fee_cents INTEGER,
    funded_at TIMESTAMP,
    released_at TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_human ON tasks(human_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_escrow_status ON tasks(escrow_status);
CREATE INDEX idx_tasks_deposit ON tasks(deposit_amount_cents);

-- ============================================
-- TASK APPLICATIONS
-- ============================================
CREATE TABLE task_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, human_id)
);

CREATE INDEX idx_applications_task ON task_applications(task_id);
CREATE INDEX idx_applications_human ON task_applications(human_id);

-- ============================================
-- TRANSACTIONS (Legacy - for reference)
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEPOSITS (NEW - for escrow)
-- ============================================
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(128) UNIQUE NOT NULL,
    from_address VARCHAR(64) NOT NULL,
    amount_cents INTEGER NOT NULL,
    matched_task_id UUID REFERENCES tasks(id),
    matched_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deposits_tx ON deposits(tx_hash);
CREATE INDEX idx_deposits_task ON deposits(matched_task_id);
CREATE INDEX idx_deposits_unmatched ON deposits(matched_task_id) WHERE matched_task_id IS NULL;

-- ============================================
-- PAYOUTS (NEW - for audit)
-- ============================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tx_hash VARCHAR(128) NOT NULL,
    amount_cents INTEGER NOT NULL,
    fee_cents INTEGER NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payouts_task ON payouts(task_id);
CREATE INDEX idx_payouts_human ON payouts(human_id);
CREATE INDEX idx_payouts_tx ON payouts(tx_hash);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample categories
INSERT INTO user_categories (user_id, category_id, is_professional) VALUES
    ((SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1), 'delivery', FALSE),
    ((SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1), 'errands', FALSE);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Policies can be added here as needed
