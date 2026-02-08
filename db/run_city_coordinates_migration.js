// Script to run city coordinates migration
// Adds latitude and longitude columns to users table

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting city coordinates migration...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'add_city_coordinates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements (basic split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('_sql').select(statement);
          if (directError) {
            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
          }
        }
      }
    }

    // Verify the migration worked
    console.log('\n✅ Migration completed! Verifying...\n');

    const { data, error } = await supabase
      .from('users')
      .select('id, city, latitude, longitude')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
    } else {
      console.log('✅ Verification successful!');
      console.log('   - Users table now has latitude and longitude columns');
      console.log('   - Sample:', data[0] || 'No users found');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
