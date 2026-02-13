-- Add avatar_data column to store base64-encoded avatar image
-- This allows serving avatars without R2 storage dependency
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_data IS 'Base64 data URL of the avatar image. Used as fallback when R2 storage is unavailable.';
