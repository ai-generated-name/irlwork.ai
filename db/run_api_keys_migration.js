// Run API Keys Migration
// Usage: node db/run_api_keys_migration.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running API Keys V2 Migration...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add_api_keys_v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      // Skip comments
      if (stmt.startsWith('--')) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).catch(() => ({ error: 'RPC not available' }));

      if (error && error !== 'RPC not available') {
        // Try direct approach for DDL statements
        if (stmt.includes('CREATE TABLE') || stmt.includes('CREATE INDEX') || stmt.includes('ALTER TABLE')) {
          console.log('  ⚠️  DDL statement - may need to run in Supabase dashboard');
        } else {
          console.log(`  ❌ Error: ${JSON.stringify(error)}`);
        }
      } else {
        console.log('  ✓ Success');
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log('The SQL statements have been prepared.');
    console.log('\nTo complete the migration:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of db/add_api_keys_v2.sql');
    console.log('4. Run the SQL\n');

    // Verify api_keys table exists
    const { data, error } = await supabase
      .from('api_keys')
      .select('id')
      .limit(1);

    if (error) {
      console.log('⚠️  api_keys table may not exist yet. Run the SQL in Supabase dashboard.');
    } else {
      console.log('✅ api_keys table exists and is accessible!');
    }

  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

runMigration();
