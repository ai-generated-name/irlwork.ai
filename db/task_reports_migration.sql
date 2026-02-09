-- Task Reports & Moderation System Migration
-- Adds community reporting for tasks + moderation columns on tasks and users

-- ============================================================================
-- 1. task_reports table
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who and what
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Report details
    reason VARCHAR(50) NOT NULL,  -- scam_fraud, misleading, inappropriate, spam, illegal, harassment, other
    description TEXT,

    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending',  -- pending, reviewing, resolved, dismissed

    -- Admin resolution
    resolved_by UUID REFERENCES users(id),
    resolution_action VARCHAR(50),  -- no_action, warning_issued, task_hidden, task_removed, user_suspended, user_banned
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate reports from same user on same task
    UNIQUE(task_id, reporter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_reports_task ON task_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_reporter ON task_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_created ON task_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reports_pending_queue ON task_reports(status, created_at DESC)
    WHERE status IN ('pending', 'reviewing');

-- ============================================================================
-- 2. Moderation columns on tasks
-- ============================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) DEFAULT 'clean';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_moderation ON tasks(moderation_status);

-- ============================================================================
-- 3. Moderation columns on users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reports_received INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reports_upheld INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) DEFAULT 'good_standing';
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- ============================================================================
-- 4. RLS policies
-- ============================================================================
ALTER TABLE task_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_reports_view_own ON task_reports
    FOR SELECT
    USING (auth.uid() = reporter_id);

CREATE POLICY task_reports_create ON task_reports
    FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);
