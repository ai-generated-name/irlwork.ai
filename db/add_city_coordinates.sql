-- Migration: Add city coordinates to users table
-- Purpose: Enable distance-based filtering for humans and tasks
-- Date: 2026-02-07

-- Add latitude and longitude columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude);

-- Add comments for documentation
COMMENT ON COLUMN users.latitude IS 'User city latitude for distance-based filtering (stored as decimal degrees)';
COMMENT ON COLUMN users.longitude IS 'User city longitude for distance-based filtering (stored as decimal degrees)';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('latitude', 'longitude');
