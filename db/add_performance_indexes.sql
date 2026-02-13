-- Performance indexes for common query patterns
-- Run in Supabase SQL Editor

-- Task queries (browse, filter, agent/human lookups)
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_human_id ON tasks(human_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at DESC);

-- Task applications
CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_human_id ON task_applications(human_id);

-- Messages & conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_human_id ON conversations(human_id);

-- API keys (auth lookup)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Notifications (per-user unread)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Pending transactions (balance promoter)
CREATE INDEX IF NOT EXISTS idx_pending_transactions_user_id ON pending_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_status ON pending_transactions(status);
