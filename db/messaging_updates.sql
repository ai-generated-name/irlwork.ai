-- Messaging System Updates Migration
-- Run this in Supabase SQL Editor

-- 1. Add unique constraint to prevent duplicate conversations
-- NOTE: The actual DB uses human_id (not user_id) for the worker column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_conversation_per_task'
  ) THEN
    ALTER TABLE conversations
    ADD CONSTRAINT unique_conversation_per_task
    UNIQUE (human_id, agent_id, task_id);
  END IF;
END $$;

-- 2. Add webhook_secret column to users table for webhook signature verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- 3. Add read_at column to messages if it doesn't exist (for read tracking)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Create get_unread_summary RPC function
-- Returns unread message summary for a user across all their conversations
-- NOTE: Uses human_id (not user_id) to match actual DB schema
CREATE OR REPLACE FUNCTION get_unread_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH conv_data AS (
    SELECT
      c.id as conversation_id,
      c.task_id,
      t.title as task_title,
      -- Conditionally select the OTHER party's name (not the caller's)
      CASE WHEN c.human_id = p_user_id
        THEN (SELECT name FROM users WHERE id = c.agent_id)
        ELSE (SELECT name FROM users WHERE id = c.human_id)
      END as other_party_name,
      COUNT(m.id) as unread_count,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as latest_message_preview,
      MAX(m.created_at) as latest_message_at
    FROM conversations c
    JOIN tasks t ON c.task_id = t.id
    LEFT JOIN messages m ON m.conversation_id = c.id
      AND m.sender_id != p_user_id
      AND m.read_at IS NULL
    WHERE c.agent_id = p_user_id OR c.human_id = p_user_id
    GROUP BY c.id, c.task_id, t.title, c.human_id, c.agent_id
    HAVING COUNT(m.id) > 0
  )
  SELECT json_build_object(
    'total_unread', COALESCE((SELECT SUM(unread_count) FROM conv_data), 0),
    'conversations', COALESCE(
      (SELECT json_agg(row_to_json(conv_data)) FROM conv_data),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Create index for faster unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(conversation_id, sender_id, read_at)
WHERE read_at IS NULL;

-- 6. Create index for faster conversation lookups by participants
CREATE INDEX IF NOT EXISTS idx_conversations_participants
ON conversations(human_id, agent_id, task_id);
