/**
 * Balance Promoter Service
 *
 * Runs every 15 minutes to promote pending transactions to available
 * after the 48-hour dispute window has passed.
 *
 * Usage:
 *   const { startBalancePromoter } = require('./services/balancePromoter');
 *   startBalancePromoter(supabaseClient, createNotification);
 */

const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

let isRunning = false;
let intervalId = null;

/**
 * Promote pending balances to available after dispute window
 * @param {object} supabase - Supabase client
 * @param {function} createNotification - Notification function
 */
async function promotePendingBalances(supabase, createNotification) {
  if (!supabase) {
    console.error('[BalancePromoter] No supabase client provided');
    return;
  }

  try {
    console.log('[BalancePromoter] Checking for cleared transactions...');

    // Get all pending transactions that have passed their clears_at time
    const { data: cleared, error: selectError } = await supabase
      .from('pending_transactions')
      .select('id, user_id, amount_cents, task_id, clears_at')
      .eq('status', 'pending')
      .lt('clears_at', new Date().toISOString());

    if (selectError) {
      console.error('[BalancePromoter] Error fetching cleared transactions:', selectError);
      return;
    }

    if (!cleared || cleared.length === 0) {
      console.log('[BalancePromoter] No transactions ready to clear');
      return;
    }

    console.log(`[BalancePromoter] Found ${cleared.length} transactions to promote`);

    // Process each cleared transaction
    for (const tx of cleared) {
      try {
        // Update status to 'available'
        const { error: updateError } = await supabase
          .from('pending_transactions')
          .update({
            status: 'available',
            cleared_at: new Date().toISOString()
          })
          .eq('id', tx.id);

        if (updateError) {
          console.error(`[BalancePromoter] Error updating transaction ${tx.id}:`, updateError);
          continue;
        }

        const amount = tx.amount_cents / 100;

        console.log(`[BalancePromoter] Promoted transaction ${tx.id} - $${amount.toFixed(2)} now available for ${tx.user_id}`);

        // Send notification to worker
        if (createNotification) {
          await createNotification(
            tx.user_id,
            'balance_available',
            'Payment Available!',
            `$${amount.toFixed(2)} USDC is now available for withdrawal. The 48-hour dispute window has passed.`,
            `/wallet`
          );
        }

        // Also update the payout status
        await supabase
          .from('payouts')
          .update({ status: 'available' })
          .eq('task_id', tx.task_id)
          .eq('status', 'pending');

      } catch (error) {
        console.error(`[BalancePromoter] Error processing transaction ${tx.id}:`, error);
      }
    }

    console.log('[BalancePromoter] Promotion cycle complete');

  } catch (error) {
    console.error('[BalancePromoter] Unexpected error:', error);
  }
}

/**
 * Start the balance promoter service
 * @param {object} supabase - Supabase client
 * @param {function} createNotification - Notification function
 */
function startBalancePromoter(supabase, createNotification) {
  if (isRunning) {
    console.log('[BalancePromoter] Already running');
    return;
  }

  console.log(`[BalancePromoter] Starting... (interval: ${POLL_INTERVAL / 1000}s)`);

  // Run immediately on start
  promotePendingBalances(supabase, createNotification).catch(console.error);

  // Then run on interval
  intervalId = setInterval(() => {
    promotePendingBalances(supabase, createNotification).catch(console.error);
  }, POLL_INTERVAL);

  isRunning = true;
  console.log('[BalancePromoter] Service started successfully');
}

/**
 * Stop the balance promoter service
 */
function stopBalancePromoter() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log('[BalancePromoter] Service stopped');
}

/**
 * Get service status
 */
function getStatus() {
  return {
    isRunning,
    pollInterval: POLL_INTERVAL,
    pollIntervalSeconds: POLL_INTERVAL / 1000
  };
}

module.exports = {
  startBalancePromoter,
  stopBalancePromoter,
  promotePendingBalances,
  getStatus
};
