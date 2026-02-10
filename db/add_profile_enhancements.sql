-- Migration: Add headline, languages, and timezone to users table
-- Run in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS headline VARCHAR(120),
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80);

COMMENT ON COLUMN users.headline IS 'Short profile headline, e.g. "Professional Photographer & Drone Pilot"';
COMMENT ON COLUMN users.languages IS 'Array of languages spoken, e.g. ["English", "Spanish"]';
COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier, e.g. "America/Los_Angeles"';
