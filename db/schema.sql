-- irlwork.ai Supabase Database Schema
-- Migration from SQLite to PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS (renamed from humans) ============
CREATE TABLE IF NOT EXISTS humans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'human' CHECK (type IN ('human', 'agent')),
    api_key TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    hourly_rate REAL DEFAULT 25,
    account_type TEXT DEFAULT 'human',
    
    -- Location
    city TEXT,
    state TEXT,
    zip TEXT,
    service_radius REAL DEFAULT 25,
    
    -- Professional
    professional_category TEXT,
    license_number TEXT,
    certification_url TEXT,
    insurance_provider TEXT,
    insurance_expiry TEXT,
    portfolio_url TEXT,
    skills TEXT DEFAULT '[]',
    
    -- Wallet (NEW)
    wallet_address TEXT UNIQUE,
    wallet_verified BOOLEAN DEFAULT FALSE,
    deposit_address TEXT,
    
    -- Status
    profile_completeness REAL DEFAULT 0.2,
    availability TEXT DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    stripe_account_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ AGENTS (separate from humans) ============
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    organization TEXT,
    api_calls INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ USER CATEGORIES ============
CREATE TABLE IF NOT EXISTS user_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    is_professional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(human_id, category_id)
);

-- ============ CERTIFICATIONS ============
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    document_url TEXT,
    license_number TEXT,
    issuer TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ TASKS (with escrow columns) ============
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    location TEXT,
    
    -- Budget
    budget_type TEXT DEFAULT 'hourly' CHECK (budget_type IN ('hourly', 'fixed', 'milestone')),
    budget_min REAL,
    budget_max REAL,
    
    -- Timing
    duration_hours REAL,
    urgency TEXT DEFAULT 'scheduled' CHECK (urgency IN ('scheduled', 'urgent', 'asap')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    
    -- Insurance
    insurance_option TEXT,
    
    -- Escrow status (NEW)
    escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'deposited', 'released', 'refunded')),
    escrow_amount REAL,
    escrow_deposit_tx TEXT,
    escrow_deposited_at TIMESTAMP WITH TIME ZONE,
    escrow_released_at TIMESTAMP WITH TIME ZONE,
    unique_deposit_amount NUMERIC(20, 6), -- Budget + random cents for matching
    
    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ TASK APPLICATIONS ============
CREATE TABLE IF NOT EXISTS task_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    proposed_rate REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, human_id)
);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    
    -- Amounts
    amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    net_amount REAL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'released', 'refunded', 'failed')),
    
    -- Blockchain (NEW)
    deposit_tx TEXT,
    deposit_block INTEGER,
    deposit_timestamp TIMESTAMP WITH TIME ZONE,
    release_tx TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ DEPOSITS (NEW) ============
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    
    -- Amount
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USDC',
    
    -- Blockchain
    tx_hash TEXT NOT NULL,
    block_number INTEGER,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'matched', 'failed')),
    matched_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ PAYOUTS (NEW) ============
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    
    -- Amounts
    gross_amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    
    -- Destination
    wallet_address TEXT NOT NULL,
    
    -- Blockchain
    tx_hash TEXT,
    block_number INTEGER,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_human ON tasks(human_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_escrow ON tasks(escrow_status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_transactions_task ON transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_deposits_tx ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_humans_wallet ON humans(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_humans_updated_at BEFORE UPDATE ON humans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ FUNCTIONS ============
-- Get unique deposit amount for escrow matching
CREATE OR REPLACE FUNCTION generate_unique_deposit_amount(budget_amount REAL)
RETURNS NUMERIC AS $$
DECLARE
    random_cents NUMERIC(4, 2);
BEGIN
    random_cents := (random() * 99 + 1) / 100; -- 0.01 to 0.99
    RETURN ROUND((budget_amount + random_cents)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;
