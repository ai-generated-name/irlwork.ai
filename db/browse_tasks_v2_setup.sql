-- Browse Tasks V2 Setup
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- 1. CREATE RPC FUNCTION FOR NEARBY TASK SEARCH
-- ============================================
CREATE OR REPLACE FUNCTION search_tasks_nearby(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius DOUBLE PRECISION DEFAULT 25,
  category_filter TEXT DEFAULT NULL,
  search_text TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'distance',
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  budget NUMERIC,
  duration TEXT,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT,
  agent_id UUID,
  human_id UUID,
  created_at TIMESTAMPTZ,
  is_remote BOOLEAN,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.title, t.description, t.category, t.budget, t.duration,
    t.location, t.latitude, t.longitude, t.status, t.agent_id, t.human_id,
    t.created_at, t.is_remote,
    (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) AS distance_km
  FROM tasks t
  WHERE t.status = 'open'
    AND (category_filter IS NULL OR t.category = category_filter)
    AND (search_text IS NULL OR t.title ILIKE '%' || search_text || '%' OR t.description ILIKE '%' || search_text || '%')
    AND t.latitude IS NOT NULL
    AND t.longitude IS NOT NULL
    AND (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) <= radius
  ORDER BY
    -- Primary sort with tiebreakers
    CASE WHEN sort_by = 'distance' THEN (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) END ASC NULLS LAST,
    CASE WHEN sort_by = 'distance' THEN t.created_at END DESC,
    CASE WHEN sort_by = 'pay_high' THEN t.budget END DESC NULLS LAST,
    CASE WHEN sort_by = 'pay_high' THEN (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) END ASC,
    CASE WHEN sort_by = 'pay_low' THEN t.budget END ASC NULLS LAST,
    CASE WHEN sort_by = 'pay_low' THEN (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) END ASC,
    CASE WHEN sort_by = 'newest' THEN t.created_at END DESC,
    CASE WHEN sort_by = 'newest' THEN (6371 * acos(
      LEAST(1.0, cos(radians(user_lat)) * cos(radians(t.latitude)) *
      cos(radians(t.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(t.latitude)))
    )) END ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. ADD INDEX FOR LOCATION-BASED QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_location_open
ON tasks(latitude, longitude)
WHERE status = 'open' AND latitude IS NOT NULL;

-- ============================================
-- 3. SEED TEST AGENT (if none exists)
-- ============================================
INSERT INTO users (id, email, name, type, created_at)
SELECT gen_random_uuid(), 'test-agent@irlwork.ai', 'Test Agent', 'agent', NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE type = 'agent');

-- ============================================
-- 4. SEED TEST TASKS IN HO CHI MINH CITY
-- ============================================
WITH agent AS (SELECT id FROM users WHERE type = 'agent' LIMIT 1)
INSERT INTO tasks (id, agent_id, title, description, category, location, latitude, longitude, budget, status, created_at)
SELECT gen_random_uuid(), agent.id,
   'Pick up documents from District 1 notary',
   'Collect signed documents from notary on Nguyen Hue, deliver to District 7.',
   'delivery', 'District 1, Ho Chi Minh City', 10.7769, 106.7009, 15, 'open', NOW() - INTERVAL '2 hours'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Photograph coffee shop interior',
   'Take 20+ high-quality photos of our new coffee shop for Google Maps. Must have own camera.',
   'photography', 'District 3, Ho Chi Minh City', 10.7831, 106.6892, 40, 'open', NOW() - INTERVAL '5 hours'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Check product availability at 3 stores',
   'Visit 3 electronics stores in District 10 and check if specific laptop models are in stock.',
   'data-collection', 'District 10, Ho Chi Minh City', 10.7725, 106.6671, 25, 'open', NOW() - INTERVAL '1 day'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Set up Ubiquiti UniFi access point',
   'Install and configure a UniFi AP at a small office. Must have networking experience.',
   'tech-setup', 'Thu Duc, Ho Chi Minh City', 10.8494, 106.7530, 60, 'open', NOW() - INTERVAL '3 hours'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Translate 2-page contract VN to EN',
   'Translate a short rental contract from Vietnamese to English. Legal accuracy important.',
   'translation', 'District 7, Ho Chi Minh City', 10.7295, 106.7218, 30, 'open', NOW() - INTERVAL '12 hours'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Verify business address exists',
   'Go to this address and confirm there is an active business operating there. Take a photo.',
   'verification', 'Binh Thanh, Ho Chi Minh City', 10.8015, 106.7107, 10, 'open', NOW() - INTERVAL '6 hours'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Grocery delivery from Vinmart',
   'Buy specific items from Vinmart and deliver to my apartment in District 2.',
   'errands', 'District 2, Ho Chi Minh City', 10.7868, 106.7497, 12, 'open', NOW() - INTERVAL '30 minutes'
FROM agent
UNION ALL SELECT gen_random_uuid(), agent.id,
   'Return package to post office',
   'Drop off a pre-labeled return package at the nearest Vietnam Post office.',
   'delivery', 'District 1, Ho Chi Minh City', 10.7756, 106.7019, 8, 'open', NOW() - INTERVAL '4 hours'
FROM agent;

-- ============================================
-- DONE! Verify with:
-- ============================================
-- SELECT * FROM tasks WHERE status = 'open' AND latitude IS NOT NULL LIMIT 5;
-- SELECT search_tasks_nearby(10.8231, 106.6297, 50, NULL, NULL, 'distance', 10, 0);
