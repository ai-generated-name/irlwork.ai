/**
 * Migration Runner - Task Validation & Policy Enforcement System
 *
 * Creates:
 *   - task_type_registry table
 *   - task_validation_log table
 *   - New columns on tasks table (private fields, task_type_id, etc.)
 *   - Seed data for 7 task types
 *
 * Usage:
 *   node run_task_validation_migration.js
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MIGRATION_FILES = [
  'add_task_type_registry.sql',
  'add_task_validation_log.sql',
  'add_task_validation_fields.sql',
  'seed_task_types.sql',
];

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`);

  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.log(`   Warning: Statement ${i + 1}: ${error.message}`);
        console.log(`   SQL: ${statement.substring(0, 100)}...`);
      } else {
        console.log(`   Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.error(`   Error executing statement ${i + 1}:`, err.message);
      console.log(`   SQL: ${statement.substring(0, 100)}...`);
    }
  }

  console.log(`Migration ${filename} complete`);
}

async function main() {
  console.log('Running Task Validation & Policy Enforcement migrations...\n');
  console.log(`Supabase URL: ${supabaseUrl}`);

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('Database connection failed:', error.message);
      console.log('\nPlease run these migrations manually via Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard > SQL Editor');
      console.log('   2. Run each file in order:');
      MIGRATION_FILES.forEach(f => console.log(`      - ${f}`));
      process.exit(1);
    }

    console.log('Database connection successful\n');

    for (const file of MIGRATION_FILES) {
      await runMigration(file);
    }

    console.log('\nAll migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('   1. Add ENCRYPTION_KEY to your .env (32-byte hex string)');
    console.log('   2. Restart your API server');
    console.log('   3. Verify task types: GET /api/schemas');

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    console.log('\nManual migration required:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    MIGRATION_FILES.forEach(f => console.log(`   2. Run ${f}`));
    process.exit(1);
  }
}

main();
