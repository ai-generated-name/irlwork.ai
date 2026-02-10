-- Add missing profile columns to users table
-- These columns are referenced in the application code but were never created via migration

-- travel_radius: Used in registration, onboarding, profile updates, and frontend display
ALTER TABLE users ADD COLUMN IF NOT EXISTS travel_radius DECIMAL(10,2) DEFAULT 25.00;

-- needs_onboarding: Used to track whether user has completed onboarding flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_onboarding BOOLEAN DEFAULT TRUE;

-- languages: User's spoken languages for profile display
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]';

-- Backfill travel_radius from existing service_radius values where available
UPDATE users SET travel_radius = service_radius WHERE travel_radius IS NULL AND service_radius IS NOT NULL;

-- Backfill needs_onboarding based on onboarding_completed_at
UPDATE users SET needs_onboarding = FALSE WHERE onboarding_completed_at IS NOT NULL;
