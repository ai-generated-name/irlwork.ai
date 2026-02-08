-- Add page_views table for tracking task and profile views
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL CHECK (page_type IN ('task', 'profile')),
  target_id UUID NOT NULL,
  viewer_id UUID,
  referrer TEXT,
  ai_source TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_target ON page_views(page_type, target_id, created_at);
