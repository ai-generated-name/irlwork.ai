-- Migration: Add location fields to users and tasks tables
-- Date: 2026-02-08
-- Purpose: Enable geo-based filtering with CityAutocomplete component

-- ============================================
-- USERS TABLE - Add country fields
-- (latitude/longitude already exist from add_city_coordinates.sql)
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Index for country-based filtering
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_code);

COMMENT ON COLUMN users.country IS 'User country name (e.g., USA, France)';
COMMENT ON COLUMN users.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, FR)';

-- ============================================
-- TASKS TABLE - Add all geo fields
-- ============================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Spatial index for geo queries
CREATE INDEX IF NOT EXISTS idx_tasks_coordinates ON tasks(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tasks_country ON tasks(country_code);

COMMENT ON COLUMN tasks.latitude IS 'Task location latitude';
COMMENT ON COLUMN tasks.longitude IS 'Task location longitude';
COMMENT ON COLUMN tasks.country IS 'Task location country name';
COMMENT ON COLUMN tasks.country_code IS 'ISO 3166-1 alpha-2 country code';

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Check users table columns
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name IN ('latitude', 'longitude', 'country', 'country_code');

-- Check tasks table columns
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'tasks' AND column_name IN ('latitude', 'longitude', 'country', 'country_code');
