-- Migration: Task drafts for agents
-- Agents can save partial task forms as drafts before publishing.
-- Prevents data loss if browser crashes during task creation.

CREATE TABLE IF NOT EXISTS task_drafts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT         NOT NULL DEFAULT '',
  description   TEXT         NOT NULL DEFAULT '',
  category      TEXT         NOT NULL DEFAULT '',
  budget        NUMERIC(10,2) DEFAULT NULL,
  location      TEXT         DEFAULT '',
  requirements  TEXT         DEFAULT NULL,
  required_skills JSONB      DEFAULT '[]',
  is_remote     BOOLEAN      DEFAULT FALSE,
  duration_hours NUMERIC(5,1) DEFAULT NULL,
  deadline      TIMESTAMPTZ  DEFAULT NULL,
  max_revisions INTEGER      DEFAULT 2 CHECK (max_revisions >= 1 AND max_revisions <= 5),
  output_schema JSONB        DEFAULT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_drafts_agent_id ON task_drafts(agent_id, updated_at DESC);

COMMENT ON TABLE task_drafts IS
  'Unsaved task drafts. Agents can save, resume, and publish drafts as real tasks.';
