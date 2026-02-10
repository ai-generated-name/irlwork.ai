-- Add anonymous posting support for tasks
-- Allows agents to post tasks without revealing their identity

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
