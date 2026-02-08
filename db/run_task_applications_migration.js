/**
 * Create task_applications table
 * Run with: node run_task_applications_migration.js
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
  console.log('🚀 Creating task_applications table...\n');

  // Test if table already exists by trying to query it
  const { error: checkError } = await supabase
    .from('task_applications')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ task_applications table already exists!');
    return;
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('✅ task_applications table exists (error was:', checkError.message, ')');
    return;
  }

  console.log('📝 Table does not exist, creating via SQL...\n');
  console.log('⚠️  Supabase client cannot execute DDL (CREATE TABLE) statements.');
  console.log('   Please run the following SQL in your Supabase Dashboard:\n');
  console.log('   https://supabase.com/dashboard → SQL Editor\n');
  console.log('─'.repeat(60));
  console.log(`
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
`);
  console.log('─'.repeat(60));
  console.log('\nAfter running the SQL, restart the API server.');
}

main().catch(console.error);
