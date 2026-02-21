-- Add wallet_address column to users table for USDC withdrawals on Base
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)
  WHERE wallet_address IS NOT NULL;

COMMENT ON COLUMN users.wallet_address IS 'Base network wallet address (0x...) for receiving USDC payouts';
