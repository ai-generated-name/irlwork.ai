-- Fix API Keys Table for Backend Access
-- The backend uses anon key, so we need to allow public access
-- Security is handled by the API layer (authentication middleware)

-- First, ensure all columns exist
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Default Key';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Add rate_limits table if not exists
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(ip_hash, action, first_attempt_at);

-- IMPORTANT: Disable RLS for api_keys since auth is handled by the API layer
-- The backend validates tokens before allowing access to keys
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Also ensure rate_limits is accessible
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;

-- Add user columns if needed
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT;
