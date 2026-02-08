// Test script to simulate deposit confirmation and task completion
const path = require('path');
require('./api/node_modules/dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('./api/node_modules/@supabase/supabase-js');
const { v4: uuidv4 } = require('./api/node_modules/uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TASK_ID = 'eb917333-ce58-4a45-81b1-04d211d5e182';
const HUMAN_ID = 'fa5ba44f-9512-4a53-8edf-dfc71acdc5f9';

async function run() {
  console.log('1. Simulating deposit confirmation...');

  // Update task to in_progress (deposit confirmed)
  const { error: depositError } = await supabase
    .from('tasks')
    .update({
      escrow_status: 'deposited',
      status: 'in_progress',
      work_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', TASK_ID);

  if (depositError) {
    console.error('Deposit simulation failed:', depositError);
    return;
  }
  console.log('   ✓ Task status: in_progress, escrow_status: deposited');

  console.log('\n2. Simulating human completing task...');

  // Skip proof record creation - just update task status
  // (The approve_task endpoint doesn't require a proof record)

  // Update task to pending_review
  const { error: reviewError } = await supabase
    .from('tasks')
    .update({
      status: 'pending_review',
      proof_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', TASK_ID);

  if (reviewError) {
    console.error('Status update failed:', reviewError);
    return;
  }
  console.log('   ✓ Task status: pending_review');

  // Verify final state
  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, escrow_status, proof_submitted_at')
    .eq('id', TASK_ID)
    .single();

  console.log('\n3. Final task state:', task);
  console.log('\nReady for agent to approve via MCP!');
}

run().catch(console.error);
