/**
 * Page Views Migration Runner
 *
 * Usage:
 *   node run_page_views_migration.js
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) must be set in .env');
  console.log('\n⚠️  Please run this migration manually:');
  console.log('   1. Go to: https://supabase.com/dashboard → SQL Editor');
  console.log('   2. Copy and paste the contents of: db/add_page_views.sql');
  console.log('   3. Run the migration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running page_views table migration...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const { data: testData, error: testError } = await supabase.from('users').select('id').limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      console.log('\n⚠️  Please run this migration manually:');
      console.log('   1. Go to: https://supabase.com/dashboard → SQL Editor');
      console.log('   2. Copy and paste the contents of: db/add_page_views.sql');
      console.log('   3. Run the migration');
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');

    // Read the migration file
    const filePath = path.join(__dirname, 'add_page_views.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('📝 Executing migration...\n');
    console.log(sql);
    console.log('\n');

    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the SQL editor or create an RPC function
    console.log('⚠️  The Supabase JS client cannot execute raw SQL directly.');
    console.log('    Please run this migration manually via the Supabase Dashboard:\n');
    console.log('    1. Go to: https://supabase.com/dashboard → SQL Editor');
    console.log('    2. Select your project');
    console.log('    3. Create a new query');
    console.log('    4. Copy and paste the SQL shown above');
    console.log('    5. Click "Run"\n');
    console.log('OR if you have psql installed:');
    console.log(`    psql "${supabaseUrl.replace('https://', 'postgresql://postgres:YOUR_PASSWORD@').replace('.supabase.co', '.supabase.co:5432/postgres')}" < db/add_page_views.sql\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
