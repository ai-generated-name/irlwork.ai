-- API Keys V2 Migration for irlwork.ai
-- This creates a proper API key system with hashed keys, prefixes, and management features

-- Drop old api_keys table if it exists with different structure
-- Note: We're creating a new structure that's compatible with secure API key management

-- Create the new api_keys table (if it doesn't exist or update existing)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT DEFAULT 'Default Key',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Add columns if they don't exist (for updating existing tables)
DO $$ BEGIN
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Default Key';
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Columns already exist';
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id, is_active) WHERE is_active = TRUE;

-- Add role column to users if it doesn't exist (for agent role tracking)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'User columns already exist';
END $$;

-- Create rate limiting table for agent registration
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(ip_hash, action, first_attempt_at);

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can manage own api keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can delete own api keys" ON api_keys;
EXCEPTION
    WHEN undefined_object THEN RAISE NOTICE 'Policies do not exist';
END $$;

-- Create new RLS policies
CREATE POLICY "Users can view own api keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Grant service role access for backend operations
-- (The backend uses service role key which bypasses RLS)
