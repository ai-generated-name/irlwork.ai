/**
 * Run Blind Ratings Migration
 *
 * Usage:
 *   node run_blind_ratings_migration.js
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('\n🚀 Running Blind Ratings Migration...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      console.log('\n⚠️  Please run this migration manually via Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard → SQL Editor');
      console.log('   2. Copy and paste the contents of: db/add_blind_ratings.sql');
      console.log('   3. Run the migration');
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');

    // Read the migration file
    const filePath = path.join(__dirname, 'add_blind_ratings.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('📝 Executing migration...\n');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (!statement.trim() || statement.trim().startsWith('--')) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // exec_sql RPC might not exist, try alternative approach
          console.log(`   ⚠️  RPC method failed: ${error.message}`);
          console.log(`   💡 Attempting alternative execution method...`);

          // This won't work for DDL, but we'll try
          throw new Error('Please run migration manually via Supabase Dashboard');
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        console.log('\n⚠️  Manual migration required:');
        console.log('   1. Go to: https://supabase.com/dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Copy the entire contents of: db/add_blind_ratings.sql');
        console.log('   4. Paste and run in the SQL editor');
        console.log('\nOr use psql command line:');
        console.log('   psql $DATABASE_URL -f db/add_blind_ratings.sql\n');
        process.exit(1);
      }
    }

    console.log('\n✅ Blind Ratings Migration completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Restart your API server');
    console.log('   2. Rating visibility service will start automatically');
    console.log('   3. Test rating submission on completed tasks');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n⚠️  Please run migration manually:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of db/add_blind_ratings.sql');
    console.log('   3. Run in SQL editor');
    process.exit(1);
  }
}

runMigration();
