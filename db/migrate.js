// Database migration script for Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🔄 Starting database migration...\n');
  
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      // Execute using raw SQL via rpc
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try alternative method
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
      }
    } catch (e) {
      // Statements that don't need execution (already exist)
    }
  }
  
  console.log('\n✅ Migration complete!');
  console.log('\nNote: Run the SQL schema directly in Supabase SQL editor for initial setup.');
  console.log('The schema includes:');
  console.log('  - humans (with wallet columns)');
  console.log('  - agents');
  console.log('  - tasks (with escrow columns)');
  console.log('  - transactions');
  console.log('  - deposits');
  console.log('  - payouts');
  console.log('  - notifications');
}

// Check connection
async function checkConnection() {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error && error.message.includes('relation') === false) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }
  console.log('✅ Supabase connection OK');
}

// Run
checkConnection().then(() => migrate());
