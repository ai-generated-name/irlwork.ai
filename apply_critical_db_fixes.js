#!/usr/bin/env node
/**
 * Apply Critical Database Fixes
 *
 * This script fixes:
 * 1. Tasks table RLS infinite recursion
 * 2. Missing reputation_metrics columns in users table
 *
 * Run with: node apply_critical_db_fixes.js
 */

const fs = require('fs');
const https = require('https');

// Read environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL not found in .env');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('🔧 Critical Database Fixes');
console.log('========================\n');
console.log(`Project: ${projectRef}`);
console.log(`URL: ${SUPABASE_URL}\n`);

// SQL to fix tasks table RLS policies
const fixTasksRLSSQL = `
-- Fix infinite recursion in tasks table RLS policies
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tasks';
    END LOOP;
END $$;

-- Create simple, non-recursive policies
CREATE POLICY "tasks_select_public" ON tasks FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "tasks_insert_auth" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "tasks_update_owner" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "tasks_delete_owner" ON tasks FOR DELETE TO authenticated USING (auth.uid() = agent_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
`;

// SQL to add reputation metrics columns
const addReputationMetricsSQL = fs.readFileSync('db/add_reputation_metrics_final.sql', 'utf8');

console.log('📋 Fixes to apply:');
console.log('1. Fix tasks table RLS policies (infinite recursion)');
console.log('2. Add reputation metrics columns to users table\n');

console.log('⚠️  IMPORTANT: These SQL scripts need to be run manually in Supabase SQL Editor\n');
console.log('Instructions:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('2. Copy and paste EACH script below');
console.log('3. Click "Run" for each script\n');

console.log('=' .repeat(80));
console.log('SCRIPT 1: Fix Tasks Table RLS Policies');
console.log('=' .repeat(80));
console.log(fixTasksRLSSQL);

console.log('\n' + '=' .repeat(80));
console.log('SCRIPT 2: Add Reputation Metrics');
console.log('=' .repeat(80));
console.log(addReputationMetricsSQL);

console.log('\n' + '=' .repeat(80));
console.log('✅ After running both scripts, run this command to verify:');
console.log('   node test_system.js');
console.log('=' .repeat(80));
