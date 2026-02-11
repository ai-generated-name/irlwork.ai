-- Add avatar_r2_key column to store the R2 object key for avatar images
-- This allows serving avatars through the API proxy endpoint /api/avatar/:userId
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_r2_key TEXT;

-- Add an index for faster lookups when serving avatars
CREATE INDEX IF NOT EXISTS idx_users_avatar_r2_key ON users(id) WHERE avatar_r2_key IS NOT NULL;
