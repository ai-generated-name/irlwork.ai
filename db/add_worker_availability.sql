-- Migration: Worker availability schedule
-- Workers can set weekly recurring availability windows that agents can see when
-- browsing or filtering for workers with specific time availability.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS availability_timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN users.availability_schedule IS
  'Weekly availability windows. Array of {day (0=Sun..6=Sat), start ("HH:MM"), end ("HH:MM")}. '
  'Example: [{"day":1,"start":"09:00","end":"17:00"},{"day":3,"start":"10:00","end":"14:00"}]';

COMMENT ON COLUMN users.availability_timezone IS
  'IANA timezone for availability_schedule windows, e.g. "America/New_York". Defaults to UTC.';
