-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'human';
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 25;
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completeness NUMERIC DEFAULT 0;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
