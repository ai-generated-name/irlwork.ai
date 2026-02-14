-- Cleanup: close open tasks that have no coordinates and are not marked as remote.
-- These tasks bypass location/radius filtering and show up incorrectly in browse results.
-- Tasks need either valid lat/lng (for distance filtering) or is_remote=true (shown everywhere).

-- First, see what will be affected (run this SELECT first to review):
-- SELECT id, title, location, status, is_remote, latitude, longitude, created_at
-- FROM tasks
-- WHERE status = 'open'
--   AND (latitude IS NULL OR longitude IS NULL)
--   AND (is_remote IS NULL OR is_remote = false);

-- Close tasks with no coordinates that aren't remote
UPDATE tasks
SET status = 'cancelled',
    updated_at = NOW()
WHERE status = 'open'
  AND (latitude IS NULL OR longitude IS NULL)
  AND (is_remote IS NULL OR is_remote = false);
