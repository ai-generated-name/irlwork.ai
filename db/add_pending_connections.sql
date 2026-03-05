-- Device flow: agents generate a short code, humans paste it on the connect page to activate an API key
CREATE TABLE IF NOT EXISTS pending_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  api_key_plaintext TEXT,  -- stored temporarily; cleared after first retrieval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired')),
  label TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_connections_code ON pending_connections(code);
CREATE INDEX IF NOT EXISTS idx_pending_connections_expires_at ON pending_connections(expires_at);
