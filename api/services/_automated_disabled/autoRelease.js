// /api/services/autoRelease.js
// Automatically releases payment for tasks in pending_review for 48+ hours

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Initialize Supabase client only if credentials are available
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

let isRunning = false;
let pollInterval = null;

// Check interval (default 15 minutes)
const CHECK_INTERVAL_MS = parseInt(process.env.AUTO_RELEASE_INTERVAL_MS) || 15 * 60 * 1000;

// 48 hour threshold in milliseconds
const AUTO_RELEASE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Platform fee (10%)
const PLATFORM_FEE_PERCENT = 10;

/**
 * Create notification helper
 */
async function createNotification(userId, type, title, message, link) {
  try {
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[AutoRelease] Error creating notification:`, error.message);
  }
}

/**
 * Auto-approve a task and release payment
 */
async function autoApproveTask(task) {
  try {
    console.log(`[AutoRelease] Auto-approving task ${task.id}: "${task.title}"`);

    // Get latest proof
    const { data: latestProof } = await supabase
      .from('task_proofs')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestProof) {
      console.log(`[AutoRelease] No proof found for task ${task.id}, skipping`);
      return { success: false, reason: 'No proof found' };
    }

    // Update proof status to approved
    await supabase
      .from('task_proofs')
      .update({
        status: 'approved',
        agent_feedback: 'Auto-approved after 48 hours',
        updated_at: new Date().toISOString()
      })
      .eq('id', latestProof.id);

    // Calculate payment
    const escrowAmount = task.escrow_amount || task.budget || 50;
    const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
    const netAmount = escrowAmount - platformFee;
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');

    // Update task to paid with auto_released flag
    await supabase
      .from('tasks')
      .update({
        status: 'paid',
        auto_released: true,
        escrow_status: 'released',
        escrow_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);

    // Record payout
    await supabase.from('payouts').insert({
      id: uuidv4(),
      task_id: task.id,
      human_id: task.human_id,
      agent_id: task.agent_id,
      gross_amount: escrowAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      wallet_address: task.human_wallet_address || null,
      tx_hash: txHash,
      status: 'completed',
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Update human stats
    const { data: currentUser } = await supabase
      .from('users')
      .select('jobs_completed')
      .eq('id', task.human_id)
      .single();

    await supabase
      .from('users')
      .update({
        jobs_completed: (currentUser?.jobs_completed || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.human_id);

    // Notify human
    await createNotification(
      task.human_id,
      'payment_released',
      'Payment Auto-Released!',
      `Your payment of ${netAmount.toFixed(2)} USDC has been automatically released after 48 hours.`,
      `/dashboard`
    );

    // Notify agent
    await createNotification(
      task.agent_id,
      'auto_released',
      'Task Auto-Approved',
      `Task "${task.title}" was automatically approved after 48 hours. Payment released to ${task.human_name}.`,
      `/dashboard?task=${task.id}`
    );

    console.log(`[AutoRelease] ✅ Auto-approved task ${task.id}, paid ${netAmount} USDC`);

    return {
      success: true,
      taskId: task.id,
      netAmount,
      txHash
    };
  } catch (error) {
    console.error(`[AutoRelease] Error auto-approving task ${task.id}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check for tasks eligible for auto-release
 */
async function checkForStaleTasksOnce() {
  if (!supabase) {
    console.log('[AutoRelease] Supabase not configured, skipping check');
    return;
  }

  try {
    // Calculate cutoff time (48 hours ago)
    const cutoffTime = new Date(Date.now() - AUTO_RELEASE_THRESHOLD_MS);

    console.log(`[AutoRelease] Checking for tasks pending review since before ${cutoffTime.toISOString()}`);

    // Query tasks that are:
    // 1. Status is 'pending_review'
    // 2. proof_submitted_at is more than 48 hours ago
    // 3. Not already auto-released
    const { data: staleTasks, error } = await supabase
      .from('tasks')
      .select('id, title, agent_id, budget, escrow_amount, proof_submitted_at')
      .eq('status', 'pending_review')
      .eq('auto_released', false)
      .lt('proof_submitted_at', cutoffTime.toISOString())
      .not('proof_submitted_at', 'is', null);

    if (error) {
      console.error(`[AutoRelease] Query error:`, error.message);
      return;
    }

    if (!staleTasks || staleTasks.length === 0) {
      console.log(`[AutoRelease] No stale tasks found`);
      return;
    }

    console.log(`[AutoRelease] Found ${staleTasks.length} stale task(s) to auto-release`);

    // Process each stale task
    for (const task of staleTasks) {
      // Get human_id from task_proofs (submitted by the human)
      const { data: proof } = await supabase
        .from('task_proofs')
        .select('human_id')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!proof || !proof.human_id) {
        console.log(`[AutoRelease] No human found for task ${task.id}, skipping`);
        continue;
      }

      // Get human details
      const { data: human } = await supabase
        .from('users')
        .select('id, name, wallet_address')
        .eq('id', proof.human_id)
        .single();

      // Enrich task with human data
      const taskWithHumanData = {
        ...task,
        human_id: proof.human_id,
        human_name: human?.name || 'Unknown',
        human_wallet_address: human?.wallet_address
      };

      await autoApproveTask(taskWithHumanData);

      // Small delay between tasks to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[AutoRelease] Processed ${staleTasks.length} task(s)`);
  } catch (error) {
    console.error(`[AutoRelease] Check error:`, error.message);
  }
}

/**
 * Poll for stale tasks
 */
async function poll() {
  if (!isRunning) return;
  await checkForStaleTasksOnce();
}

/**
 * Start the auto-release service
 */
function start() {
  if (!supabase) {
    console.log('[AutoRelease] ⚠️  Skipping - Supabase not configured');
    return;
  }

  if (isRunning) {
    console.log('[AutoRelease] Already running');
    return;
  }

  isRunning = true;
  console.log(`[AutoRelease] Starting... (interval: ${CHECK_INTERVAL_MS}ms, threshold: 48h)`);

  // Initial check
  poll();

  // Schedule polling
  pollInterval = setInterval(poll, CHECK_INTERVAL_MS);

  console.log('[AutoRelease] ✅ Started');
}

/**
 * Stop the auto-release service
 */
function stop() {
  if (!isRunning) return;

  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log('[AutoRelease] Stopped');
}

/**
 * Check if running
 */
function isActive() {
  return isRunning;
}

/**
 * Manual trigger for testing
 */
async function checkNow() {
  console.log('[AutoRelease] Manual check triggered');
  await checkForStaleTasksOnce();
}

module.exports = {
  start,
  stop,
  isActive,
  checkNow,
  checkForStaleTasksOnce,
  CHECK_INTERVAL_MS,
  AUTO_RELEASE_THRESHOLD_MS
};

// If run directly, start the service
if (require.main === module) {
  console.log('[AutoRelease] Starting as standalone service...');
  start();

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n[AutoRelease] Shutting down...');
    stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[AutoRelease] Shutting down...');
    stop();
    process.exit(0);
  });
}
