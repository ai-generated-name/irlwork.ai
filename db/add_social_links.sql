-- Add social_links JSONB column to users table
-- Stores social media handles as JSON object: {"twitter": "handle", "instagram": "handle", ...}
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
