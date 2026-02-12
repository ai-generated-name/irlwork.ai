-- Add availability and questions columns to task_applications
-- Run this in Supabase SQL Editor

ALTER TABLE task_applications
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS questions TEXT;
