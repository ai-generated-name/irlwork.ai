/**
 * Add required_skills, max_humans, and task_type columns to tasks table
 * Run with: node run_task_fields_migration.js
 */
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../api/.env') });
} catch (e) {
  // dotenv not available, env vars should be set externally
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  console.log('Set these in ../api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Adding required_skills, max_humans, and task_type columns to tasks table...\n');

  // Test if columns exist by trying to read them
  const { data, error } = await supabase
    .from('tasks')
    .select('required_skills, max_humans, task_type')
    .limit(1);

  if (!error) {
    console.log('✅ Columns already exist!');
    return;
  }

  console.log('📝 Some columns may not exist. Please run the following SQL in your Supabase Dashboard:\n');
  console.log('   https://supabase.com/dashboard → SQL Editor\n');
  console.log('─'.repeat(60));
  console.log(`
-- Add required_skills column (array of text)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';

-- Add max_humans column (how many people can be hired for this task)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_humans INTEGER DEFAULT 1;

-- Add task_type column if it doesn't exist (direct or bounty)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'direct';
`);
  console.log('─'.repeat(60));
  console.log('\nAfter running the SQL, restart the API server.');
}

main().catch(console.error);
