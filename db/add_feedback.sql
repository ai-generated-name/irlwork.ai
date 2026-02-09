-- Feedback & Bug Report System
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_type VARCHAR(50),

    type VARCHAR(50) NOT NULL DEFAULT 'feedback',
    urgency VARCHAR(20) NOT NULL DEFAULT 'normal',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    image_urls JSONB DEFAULT '[]',

    page_url TEXT,

    status VARCHAR(50) DEFAULT 'new',
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_urgency ON feedback(urgency);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
