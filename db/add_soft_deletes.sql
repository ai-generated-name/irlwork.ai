-- Migration: Soft deletes for conversations and messages
-- Rows are marked deleted_at instead of hard-deleted, preserving audit history
-- for dispute resolution. Also adds the attachments column to messages.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Partial indexes for efficient listing of non-deleted rows
CREATE INDEX IF NOT EXISTS idx_conversations_not_deleted
  ON conversations(updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_not_deleted
  ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON COLUMN conversations.deleted_at IS
  'Soft delete timestamp. NULL = active. Set to NOW() instead of hard-deleting.';
COMMENT ON COLUMN messages.deleted_at IS
  'Soft delete timestamp. NULL = active.';
COMMENT ON COLUMN messages.attachments IS
  'Array of file attachments: [{url, filename, type, size}]. Max 5 per message.';
