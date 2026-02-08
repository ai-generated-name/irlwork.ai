-- Add task_applications table for worker applications
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS task_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    human_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    proposed_rate DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, human_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_task ON task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_applications_human ON task_applications(human_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON task_applications(status);

-- Allow public read access for task applications (agents view applicants)
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view applications for tasks they own (agents)
CREATE POLICY "Agents can view applications for their tasks" ON task_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_applications.task_id
            AND tasks.agent_id = auth.uid()
        )
    );

-- Policy: Users can view their own applications (workers)
CREATE POLICY "Workers can view their own applications" ON task_applications
    FOR SELECT USING (human_id = auth.uid());

-- Policy: Workers can insert applications
CREATE POLICY "Workers can apply to tasks" ON task_applications
    FOR INSERT WITH CHECK (human_id = auth.uid());

-- For service role (bypasses RLS), we don't need policies
-- The API server uses service role key to bypass RLS
