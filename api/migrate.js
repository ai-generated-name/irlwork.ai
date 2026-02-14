// Run database migrations for irlwork.ai
// Connects directly to Supabase Postgres via pooler using the service role key
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const projectRef = 'tqoxllqofxbcwxskguuj';
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('No service key found. Set SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const hosts = [
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
];

const migrations = [
  "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS spots_filled integer DEFAULT 0",
  "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false",
  "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_hours numeric DEFAULT null",
  "ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check",
  "UPDATE public.tasks SET task_type = 'open' WHERE task_type = 'bounty'",
  "ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check CHECK (task_type IN ('direct', 'open'))",
];

async function run() {
  console.log('Running database migrations...');

  for (const host of hosts) {
    // Use transaction mode connection (port 6543)
    const client = new Client({
      user: `postgres.${projectRef}`,
      password: key,
      host: host,
      port: 6543,
      database: 'postgres',
      ssl: true, // Simple SSL without cert verification
    });

    // Disable strict SSL
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      await client.connect();
      console.log(`Connected via ${host}`);

      for (const sql of migrations) {
        try {
          await client.query(sql);
          console.log(`  OK: ${sql.substring(0, 70)}`);
        } catch (e) {
          console.log(`  ERR: ${sql.substring(0, 50)} - ${e.message.substring(0, 60)}`);
        }
      }

      await client.end();
      console.log('Migrations complete!');
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      return;
    } catch (e) {
      console.log(`  Failed ${host}: ${e.message.substring(0, 80)}`);
      try { await client.end(); } catch (e2) {}
    }
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  console.log('\nAll connection attempts failed.');
  console.log('Please run these SQL statements manually in the Supabase SQL Editor:');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('');
  migrations.forEach(m => console.log(m + ';'));
}

run();
