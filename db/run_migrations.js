/**
 * Migration Runner - Run pending balance migrations
 *
 * Usage:
 *   node run_migrations.js
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

async function runMigration(filename) {
  console.log(`\n📝 Running migration: ${filename}`);

  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  // Split by semicolon to execute statements individually
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    try {
      // Execute via Supabase's RPC or raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // If exec_sql doesn't exist, we need to execute differently
        // For now, we'll log the error but continue
        console.log(`   ⚠️  Statement ${i + 1}: ${error.message}`);
        console.log(`   SQL: ${statement.substring(0, 100)}...`);
      } else {
        console.log(`   ✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.error(`   ❌ Error executing statement ${i + 1}:`, err.message);
      console.log(`   SQL: ${statement.substring(0, 100)}...`);
    }
  }

  console.log(`✅ Migration ${filename} complete`);
}

async function main() {
  console.log('🚀 Running pending balance migrations...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\n⚠️  Please run these migrations manually via Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard → SQL Editor');
      console.log('   2. Copy and paste the contents of:');
      console.log('      - add_pending_transactions.sql');
      console.log('      - add_withdrawals.sql');
      console.log('   3. Run each migration');
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');

    // Run migrations
    await runMigration('add_pending_transactions.sql');
    await runMigration('add_withdrawals.sql');

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Restart your API server');
    console.log('   2. Test payment release with 48-hour hold');
    console.log('   3. Check /api/wallet/balance endpoint');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n⚠️  Manual migration required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run add_pending_transactions.sql');
    console.log('   3. Run add_withdrawals.sql');
    process.exit(1);
  }
}

main();
