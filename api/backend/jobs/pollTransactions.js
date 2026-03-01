/**
 * Circle Transaction Status Polling Job
 *
 * Polls Circle for the status of pending transactions (escrow locks, payouts, refunds).
 * If a transaction has been stuck in a non-terminal state for too long, logs a warning.
 *
 * Intended to run every 5-15 minutes via cron or scheduled invocation.
 *
 * Usage:
 *   node api/backend/jobs/pollTransactions.js
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET
 */

const { createClient } = require('@supabase/supabase-js');

const STALE_THRESHOLD_MINUTES = 30;

async function pollTransactions() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[PollTx] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let circleService;
  try {
    circleService = require('../services/circleService');
  } catch (e) {
    console.error('[PollTx] Circle service not configured:', e.message);
    process.exit(1);
  }

  console.log('[PollTx] Starting transaction status polling...');

  // Check pending deposits
  const { data: pendingDeposits, error: depError } = await supabase
    .from('usdc_deposits')
    .select('id, circle_transaction_id, user_id, amount, created_at')
    .eq('status', 'pending');

  if (depError) {
    console.error('[PollTx] Failed to fetch pending deposits:', depError.message);
  } else if (pendingDeposits?.length > 0) {
    console.log(`[PollTx] Checking ${pendingDeposits.length} pending deposits...`);

    for (const deposit of pendingDeposits) {
      try {
        const tx = await circleService.getTransaction(deposit.circle_transaction_id);
        const minutesOld = (Date.now() - new Date(deposit.created_at).getTime()) / 60000;

        if (tx.state === 'COMPLETE' || tx.state === 'CONFIRMED') {
          // Deposit confirmed — update if webhook missed it
          console.log(`[PollTx] Deposit ${deposit.id} confirmed. Updating status.`);
          await supabase
            .from('usdc_deposits')
            .update({
              status: 'confirmed',
              tx_hash: tx.txHash || null,
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', deposit.id)
            .eq('status', 'pending');

          // Credit user balance if not already done (idempotent via deposit status check)
          const depositAmount = parseFloat(deposit.amount);
          const { data: userData } = await supabase
            .from('users')
            .select('usdc_available_balance')
            .eq('id', deposit.user_id)
            .single();

          if (userData) {
            const newBalance = parseFloat(userData.usdc_available_balance || '0') + depositAmount;
            await supabase
              .from('users')
              .update({ usdc_available_balance: newBalance })
              .eq('id', deposit.user_id);

            await supabase.from('usdc_ledger').insert({
              user_id: deposit.user_id,
              type: 'deposit',
              amount: depositAmount,
              balance_after: newBalance,
              circle_transaction_id: deposit.circle_transaction_id,
              tx_hash: tx.txHash || null,
              description: `Deposit confirmed (via poll) — ${depositAmount.toFixed(2)} USDC`,
            });
          }
        } else if (tx.state === 'FAILED') {
          console.warn(`[PollTx] Deposit ${deposit.id} FAILED.`);
          await supabase
            .from('usdc_deposits')
            .update({ status: 'failed' })
            .eq('id', deposit.id);
        } else if (minutesOld > STALE_THRESHOLD_MINUTES) {
          console.warn(`[PollTx] Deposit ${deposit.id} stuck in state "${tx.state}" for ${minutesOld.toFixed(0)} minutes.`);
        }
      } catch (e) {
        console.error(`[PollTx] Error checking deposit ${deposit.id}:`, e.message);
      }
    }
  }

  // Check tasks with pending Circle transactions
  const { data: pendingTasks, error: taskError } = await supabase
    .from('tasks')
    .select('id, circle_escrow_tx_id, circle_payout_tx_id, circle_refund_tx_id, status, updated_at')
    .or('circle_escrow_tx_id.not.is.null,circle_payout_tx_id.not.is.null,circle_refund_tx_id.not.is.null')
    .in('status', ['assigned', 'in_progress', 'pending_review', 'completed']);

  if (taskError) {
    console.error('[PollTx] Failed to fetch tasks:', taskError.message);
  } else if (pendingTasks?.length > 0) {
    console.log(`[PollTx] Checking ${pendingTasks.length} tasks with Circle transactions...`);

    for (const task of pendingTasks) {
      // Check each non-null Circle transaction ID
      const txIds = [
        { field: 'circle_escrow_tx_id', id: task.circle_escrow_tx_id },
        { field: 'circle_payout_tx_id', id: task.circle_payout_tx_id },
        { field: 'circle_refund_tx_id', id: task.circle_refund_tx_id },
      ].filter(t => t.id);

      for (const { field, id } of txIds) {
        try {
          const tx = await circleService.getTransaction(id);
          if (tx.state === 'FAILED') {
            console.warn(`[PollTx] Task ${task.id} has FAILED ${field}: ${id}`);
          }

          const minutesOld = (Date.now() - new Date(task.updated_at).getTime()) / 60000;
          if (tx.state !== 'COMPLETE' && tx.state !== 'CONFIRMED' && tx.state !== 'FAILED' && minutesOld > STALE_THRESHOLD_MINUTES) {
            console.warn(`[PollTx] Task ${task.id} ${field} stuck in state "${tx.state}" for ${minutesOld.toFixed(0)} minutes.`);
          }
        } catch (e) {
          console.error(`[PollTx] Error checking task ${task.id} ${field}:`, e.message);
        }
      }
    }
  }

  console.log('[PollTx] Transaction polling complete.');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  pollTransactions().catch(e => {
    console.error('[PollTx] Fatal error:', e);
    process.exit(1);
  });
}

module.exports = { pollTransactions };
