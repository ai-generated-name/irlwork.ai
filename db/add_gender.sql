-- Migration: Add gender column to users table
-- Run in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

COMMENT ON COLUMN users.gender IS 'User gender: man, woman, or other';
