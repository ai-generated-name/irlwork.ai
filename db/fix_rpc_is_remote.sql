-- Fix: Add is_remote to search_tasks_nearby RPC function
-- Run this in Supabase Dashboard > SQL Editor

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
