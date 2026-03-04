-- Migration: Add max_revisions column to tasks table
-- Allows agents to configure per-task revision limits (1-5, default 2).
-- Run in Supabase SQL Editor or via CLI.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_revisions INTEGER NOT NULL DEFAULT 2
  CHECK (max_revisions >= 1 AND max_revisions <= 5);

COMMENT ON COLUMN tasks.max_revisions IS 'Maximum proof revisions allowed before agent must approve or dispute (1-5, default 2). Locked after task is assigned.';
