/**
 * Create feedback table
 * Run with: node run_feedback_migration.js
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
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  console.log('Set these in ../api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('Creating feedback table...\n');

  const { error: checkError } = await supabase
    .from('feedback')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('feedback table already exists!');
    return;
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('feedback table exists (error was:', checkError.message, ')');
    return;
  }

  console.log('Table does not exist. Please run the following SQL in your Supabase Dashboard:\n');
  console.log('   https://supabase.com/dashboard > SQL Editor\n');
  console.log('-'.repeat(60));
  console.log(`
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
`);
  console.log('-'.repeat(60));
  console.log('\nAfter running the SQL, restart the API server.');
}

main().catch(console.error);
