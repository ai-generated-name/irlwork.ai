// Deposit Watcher Service
// Polls USDC Transfer events every 15 seconds and matches deposits to tasks
const { createPublicClient, http, formatUnits, parseUnits } = require('viem');
const { supabase } = require('../lib/supabase');
const { getBalance, getUSDCContractAddress } = require('../lib/wallet');

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;
const USDC_CONTRACT = getUSDCContractAddress();
const POLL_INTERVAL = 15000; // 15 seconds

// Create public client
const publicClient = createPublicClient({
  chain: {
    id: 8453,
    name: 'Base',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { public: { http: [BASE_RPC_URL] } }
  },
  transport: http(BASE_RPC_URL)
});

// Transfer event signature
const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Track last processed block
let lastBlockNumber = null;

async function startDepositWatcher() {
  console.log('🔄 Starting deposit watcher...');
  
  // Get initial block number
  try {
    const block = await publicClient.getBlockNumber();
    lastBlockNumber = block - 100n; // Start from 100 blocks ago to catch recent
    console.log(`   Starting from block ${lastBlockNumber}`);
  } catch (e) {
    console.error('Failed to get initial block:', e.message);
    lastBlockNumber = 0n;
  }
  
  // Start polling
  setInterval(pollDeposits, POLL_INTERVAL);
  console.log(`✅ Deposit watcher active (polling every ${POLL_INTERVAL / 1000}s)`);
}

async function pollDeposits() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    
    if (currentBlock <= lastBlockNumber) {
      return; // No new blocks
    }
    
    // Get Transfer events from platform wallet
    const transferTopic = `0x000000000000000000000000${PLATFORM_WALLET_ADDRESS?.slice(2).toLowerCase()}`;
    
    const logs = await publicClient.getLogs({
      address: USDC_CONTRACT,
      fromBlock: lastBlockNumber,
      toBlock: currentBlock,
      topics: [
        TRANSFER_SIGNATURE,
        null, // from address (any)
        transferTopic // to platform wallet
      ]
    });
    
    if (logs.length > 0) {
      console.log(`📥 Found ${logs.length} USDC transfer(s)`);
      
      for (const log of logs) {
        await processDeposit(log);
      }
    }
    
    lastBlockNumber = currentBlock;
  } catch (e) {
    console.error('Error polling deposits:', e.message);
  }
}

async function processDeposit(log) {
  try {
    // Parse event data
    // Transfer(address from, address to, uint256 value)
    const valueHex = log.data;
    const fromAddress = '0x' + log.topics[1].slice(26);
    const value = parseFloat(formatUnits(BigInt(valueHex), 6));
    
    console.log(`   Processing: ${value} USDC from ${fromAddress.slice(0, 8)}...`);
    
    // Find matching task by unique deposit amount
    // The deposit amount = budget + random cents (0.01-0.99)
    const matchingTasks = await findTaskByDepositAmount(value);
    
    if (matchingTasks.length === 0) {
      console.log(`   ⚠️ No matching task found for ${value} USDC`);
      
      // Log unknown deposit
      await logUnknownDeposit(fromAddress, value, log.transactionHash);
      return;
    }
    
    const task = matchingTasks[0];
    console.log(`   ✅ Matched to task: ${task.id}`);
    
    // Update task escrow status
    await supabase
      .from('tasks')
      .update({
        escrow_status: 'deposited',
        escrow_deposit_tx: log.transactionHash,
        escrow_deposited_at: new Date().toISOString(),
        status: 'assigned', // Auto-assign if we can determine human
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id);
    
    // Record deposit
    await supabase.from('deposits').insert({
      id: require('uuid').v4(),
      task_id: task.id,
      agent_id: task.agent_id,
      human_id: task.human_id,
      amount: value,
      currency: 'USDC',
      tx_hash: log.transactionHash,
      block_number: Number(log.blockNumber),
      from_address: fromAddress,
      to_address: PLATFORM_WALLET_ADDRESS,
      status: 'confirmed',
      matched_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    
    // Notify agent
    await createNotification(
      task.agent_id,
      'deposit_received',
      'Escrow Deposited',
      `Your deposit of ${value} USDC for task "${task.title}" has been received.`
    );
    
    // Notify assigned human (if any)
    if (task.human_id) {
      await createNotification(
        task.human_id,
        'task_funded',
        'Task Funded!',
        `The task "${task.title}" is now funded. You can begin work.`
      );
    }
    
    console.log(`   ✅ Deposit processed successfully`);
  } catch (e) {
    console.error('Error processing deposit:', e.message);
  }
}

async function findTaskByDepositAmount(amount) {
  // Look for tasks with escrow_status='pending' and matching unique_deposit_amount
  // Allow small tolerance for rounding errors
  const minAmount = amount - 0.01;
  const maxAmount = amount + 0.01;
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('escrow_status', 'pending')
    .eq('status', 'open')
    .gte('unique_deposit_amount', minAmount)
    .lte('unique_deposit_amount', maxAmount)
    .limit(1);
  
  if (error) {
    console.error('Error finding task:', error.message);
    return [];
  }
  
  return tasks || [];
}

async function logUnknownDeposit(fromAddress, amount, txHash) {
  // Log deposits that don't match any task (for debugging/auditing)
  console.log(`   📝 Logging unknown deposit: ${amount} USDC from ${fromAddress}`);
  
  await supabase.from('deposits').insert({
    id: require('uuid').v4(),
    task_id: null,
    agent_id: null,
    human_id: null,
    amount,
    currency: 'USDC',
    tx_hash: txHash,
    from_address: fromAddress,
    to_address: PLATFORM_WALLET_ADDRESS,
    status: 'pending',
    created_at: new Date().toISOString()
  });
}

async function createNotification(userId, type, title, message, link = null) {
  await supabase.from('notifications').insert({
    id: require('uuid').v4(),
    user_id: userId,
    type,
    title,
    message,
    link,
    created_at: new Date().toISOString()
  });
}

// Manual check for a specific transaction
async function checkTransaction(txHash) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    
    if (!receipt) {
      return { found: false, message: 'Transaction not found' };
    }
    
    // Parse logs for USDC transfers
    const transfers = [];
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
          log.topics[0] === TRANSFER_SIGNATURE) {
        const toAddress = '0x' + log.topics[2].slice(26);
        const value = parseFloat(formatUnits(BigInt(log.data), 6));
        
        if (toAddress.toLowerCase() === PLATFORM_WALLET_ADDRESS.toLowerCase()) {
          const fromAddress = '0x' + log.topics[1].slice(26);
          transfers.push({
            from: fromAddress,
            to: toAddress,
            value,
            txHash
          });
        }
      }
    }
    
    return { found: true, transfers };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

module.exports = {
  startDepositWatcher,
  pollDeposits,
  checkTransaction
};
