-- Supabase Schema for irlwork.ai Chat System
-- Run this SQL to create the conversations and messages tables

-- Conversations table - chat threads between humans (workers) and agents
-- NOTE: Uses human_id (not user_id) for the worker column to match production DB
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    human_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table - individual messages in conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_human_id ON conversations(human_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Update updated_at trigger for conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_timestamp ON conversations;
CREATE TRIGGER trigger_conversation_timestamp
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- RLS Policies (if using Supabase RLS)
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own conversations
-- CREATE POLICY "Users can view own conversations" ON conversations
--     FOR SELECT USING (auth.uid() = user_id OR auth.uid() = agent_id);

-- Allow users to insert their own conversations
-- CREATE POLICY "Users can create conversations" ON conversations
--     FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies
-- CREATE POLICY "Users can view messages in own conversations" ON messages
--     FOR SELECT USING (
--         EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id 
--                 AND (user_id = auth.uid() OR agent_id = auth.uid()))
--     );

-- CREATE POLICY "Users can send messages in own conversations" ON messages
--     FOR INSERT WITH CHECK (
--         EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id 
--                 AND (user_id = auth.uid() OR agent_id = auth.uid()))
--     );
