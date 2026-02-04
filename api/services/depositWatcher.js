// /backend/services/depositWatcher.js
// Polls for USDC deposits to platform wallet

const { 
  getBalance, 
  isValidAddress 
} = require('../lib/wallet');
const {
  createDeposit,
  getDepositByTxHash,
  findTaskByDepositAmount,
  matchDepositToTask,
  updateTask,
  createNotification,
  fetchRecentTransfers,
  PLATFORM_WALLET_ADDRESS
} = require('../lib/supabase');

let isRunning = false;
let pollInterval = null;

// Poll interval (default 15 seconds)
const POLL_INTERVAL_MS = parseInt(process.env.DEPOSIT_POLL_INTERVAL_MS) || 15000;

/**
 * Generate unique deposit amount from budget
 * Adds 1-99 random cents to create unique identifier
 */
function generateDepositAmount(budgetCents) {
  const randomCents = Math.floor(Math.random() * 99) + 1;
  return budgetCents + randomCents;
}

/**
 * Match a deposit to a task
 */
async function matchDeposit(deposit) {
  // Find task with matching deposit amount
  const task = await findTaskByDepositAmount(deposit.amount_cents);
  
  if (!task) {
    console.log(`[DepositWatcher] No matching task found for deposit ${deposit.amount_cents} cents`);
    return { matched: false, reason: 'No matching task' };
  }
  
  // Verify task is in correct state
  if (task.status !== 'open' || task.escrow_status !== 'unfunded') {
    console.log(`[DepositWatcher] Task ${task.id} not in correct state for matching`);
    return { matched: false, reason: 'Task not open/unfunded' };
  }
  
  // Match deposit to task
  await matchDepositToTask(deposit.id, task.id);
  
  // Update task escrow status
  await updateTask(task.id, {
    escrow_status: 'funded',
    escrow_tx_hash: deposit.tx_hash,
    funded_at: new Date().toISOString()
  });
  
  console.log(`[DepositWatcher] ✅ Matched deposit ${deposit.tx_hash} to task ${task.id}`);
  
  // Notify agent
  await createNotification({
    user_id: task.agent_id,
    type: 'task_funded',
    title: 'Task Funded!',
    message: `Your task "${task.title}" has been funded. You can now hire a worker.`,
    link: `/tasks/${task.id}`
  });
  
  return { matched: true, taskId: task.id };
}

/**
 * Process a single transfer
 */
async function processTransfer(transfer) {
  try {
    // Check if already processed
    const existing = await getDepositByTxHash(transfer.txHash);
    if (existing) {
      console.log(`[DepositWatcher] Deposit ${transfer.txHash} already processed`);
      return { processed: true, alreadyExists: true };
    }
    
    // Validate transfer
    if (!transfer.to || !isValidAddress(transfer.to)) {
      console.log(`[DepositWatcher] Invalid transfer to address`);
      return { processed: false, reason: 'Invalid to address' };
    }
    
    if (!transfer.from || !isValidAddress(transfer.from)) {
      console.log(`[DepositWatcher] Invalid transfer from address`);
      return { processed: false, reason: 'Invalid from address' };
    }
    
    // Create deposit record
    const deposit = await createDeposit({
      tx_hash: transfer.txHash,
      from_address: transfer.from,
      amount_cents: transfer.amountCents
    });
    
    console.log(`[DepositWatcher] Created deposit record: ${transfer.txHash} (${transfer.amountCents} cents)`);
    
    // Try to match to task
    const matchResult = await matchDeposit(deposit);
    
    return { 
      processed: true, 
      depositId: deposit.id,
      matched: matchResult.matched,
      taskId: matchResult.taskId 
    };
  } catch (error) {
    console.error(`[DepositWatcher] Error processing transfer:`, error.message);
    return { processed: false, error: error.message };
  }
}

/**
 * Poll for new deposits
 */
async function poll() {
  if (!isRunning) return;
  
  try {
    // Get platform wallet info
    const balanceResult = await getBalance();
    
    if (!balanceResult.success) {
      console.log(`[DepositWatcher] Wallet not available: ${balanceResult.error}`);
      return;
    }
    
    // Fetch recent transfers (requires indexer API)
    // For now, this is a placeholder - in production use Alchemy/QuickNode
    const transfers = await fetchRecentTransfers(PLATFORM_WALLET_ADDRESS);
    
    if (transfers.length === 0) {
      // No transfers to process
      return;
    }
    
    console.log(`[DepositWatcher] Found ${transfers.length} transfers to process`);
    
    // Process each transfer
    for (const transfer of transfers) {
      await processTransfer(transfer);
    }
  } catch (error) {
    console.error(`[DepositWatcher] Poll error:`, error.message);
  }
}

/**
 * Start the deposit watcher
 */
function start() {
  if (isRunning) {
    console.log('[DepositWatcher] Already running');
    return;
  }
  
  isRunning = true;
  console.log(`[DepositWatcher] Starting... (interval: ${POLL_INTERVAL_MS}ms)`);
  
  // Initial poll
  poll();
  
  // Schedule polling
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  
  console.log('[DepositWatcher] ✅ Started');
}

/**
 * Stop the deposit watcher
 */
function stop() {
  if (!isRunning) return;
  
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log('[DepositWatcher] Stopped');
}

/**
 * Check if running
 */
function isActive() {
  return isRunning;
}

/**
 * Manually check for a specific deposit amount
 * Useful for testing or manual matching
 */
async function checkForDeposit(amountCents) {
  const task = await findTaskByDepositAmount(amountCents);
  if (!task) {
    return { found: false, reason: 'No task found with this deposit amount' };
  }
  
  return { 
    found: true, 
    taskId: task.id,
    taskTitle: task.title,
    agentId: task.agent_id,
    status: task.status,
    escrowStatus: task.escrow_status
  };
}

module.exports = {
  start,
  stop,
  isActive,
  poll,
  generateDepositAmount,
  checkForDeposit,
  matchDeposit,
  POLL_INTERVAL_MS
};

// If run directly, start the watcher
if (require.main === module) {
  console.log('[DepositWatcher] Starting as standalone service...');
  start();
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n[DepositWatcher] Shutting down...');
    stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n[DepositWatcher] Shutting down...');
    stop();
    process.exit(0);
  });
}
