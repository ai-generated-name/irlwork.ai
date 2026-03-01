/**
 * Balance Promoter Service
 *
 * Runs every 15 minutes to promote pending transactions to available
 * after the 48-hour dispute window has passed.
 *
 * After promotion, auto-transfers to the worker via the matching
 * payment rail (Stripe Connect for bank, USDC on Base for wallet).
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
      .select('id, user_id, amount_cents, task_id, clears_at, payout_method')
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
        // Check for open disputes before promoting — if active, skip
        const { data: openDispute } = await supabase
          .from('disputes')
          .select('id')
          .eq('task_id', tx.task_id)
          .eq('status', 'open')
          .maybeSingle();

        if (openDispute) {
          console.log(`[BalancePromoter] Skipping tx ${tx.id} — active dispute ${openDispute.id}`);
          continue;
        }

        // Atomic update with status precondition to prevent double-promotion
        const { data: promoted, error: updateError } = await supabase
          .from('pending_transactions')
          .update({
            status: 'available',
            cleared_at: new Date().toISOString()
          })
          .eq('id', tx.id)
          .eq('status', 'pending')
          .select('id')
          .single();

        if (updateError || !promoted) {
          console.warn(`[BalancePromoter] Transaction ${tx.id} already promoted or status changed, skipping`);
          continue;
        }

        const amount = tx.amount_cents / 100;

        console.log(`[BalancePromoter] Promoted transaction ${tx.id} - $${amount.toFixed(2)} now available for ${tx.user_id}`);

        // Send notification to worker (email handled by notification pipeline — balance_available registered with defaultEmail: true)
        if (createNotification) {
          await createNotification(
            tx.user_id,
            'balance_available',
            'Payment Available!',
            `$${amount.toFixed(2)} is now available for withdrawal. The 48-hour dispute window has passed.`,
            `/payments`
          );
        }

        // Also update the payout status
        await supabase
          .from('payouts')
          .update({ status: 'available' })
          .eq('task_id', tx.task_id)
          .eq('status', 'pending');

        // Auto-transfer based on payout method (Stripe or USDC)
        const payoutMethod = tx.payout_method || 'stripe';
        let transferSucceeded = false;

        if (payoutMethod === 'stripe') {
          // Stripe auto-transfer to worker's connected bank account
          try {
            const { transferToWorker, getConnectAccountStatus } = require('./stripeService');
            const { data: worker } = await supabase
              .from('users')
              .select('stripe_account_id, stripe_onboarding_complete')
              .eq('id', tx.user_id)
              .single();

            if (worker?.stripe_account_id && worker?.stripe_onboarding_complete) {
              const status = await getConnectAccountStatus(worker.stripe_account_id);
              if (status.payouts_enabled) {
                const result = await transferToWorker(supabase, tx.id, worker.stripe_account_id, tx.amount_cents, tx.task_id);
                console.log(`[BalancePromoter] Auto-transferred $${amount.toFixed(2)} to Stripe account ${worker.stripe_account_id} (transfer: ${result.transfer_id})`);

                // Mark as withdrawn with status precondition
                await supabase
                  .from('pending_transactions')
                  .update({
                    status: 'withdrawn',
                    stripe_transfer_id: result.transfer_id,
                    withdrawn_at: new Date().toISOString()
                  })
                  .eq('id', tx.id)
                  .eq('status', 'available');
                transferSucceeded = true;
              }
            }
            // If worker doesn't have Connect set up, funds stay as 'available'
            // Mark as paid anyway — worker can manually withdraw later
            if (!transferSucceeded) transferSucceeded = true;
          } catch (transferError) {
            console.error(`[BalancePromoter] Stripe auto-transfer failed for tx ${tx.id}:`, transferError.message);
            // Funds stay as 'available' — worker can manually withdraw later
            // Still mark task as paid since funds ARE available for withdrawal
            transferSucceeded = true;
          }
        } else if (payoutMethod === 'usdc') {
          // USDC auto-transfer to worker's wallet address on Base
          try {
            const { sendUSDC, isValidAddress } = require('../lib/wallet');
            const { data: worker } = await supabase
              .from('users')
              .select('wallet_address')
              .eq('id', tx.user_id)
              .single();

            if (worker?.wallet_address && isValidAddress(worker.wallet_address)) {
              const amountUSDC = tx.amount_cents / 100;
              const result = await sendUSDC(worker.wallet_address, amountUSDC);
              if (result.success) {
                console.log(`[BalancePromoter] Auto-transferred ${amountUSDC} USDC to ${worker.wallet_address} (tx: ${result.txHash})`);

                await supabase
                  .from('pending_transactions')
                  .update({
                    status: 'withdrawn',
                    withdrawn_at: new Date().toISOString(),
                    notes: `USDC auto-transfer: ${result.txHash}`
                  })
                  .eq('id', tx.id)
                  .eq('status', 'available');
                transferSucceeded = true;
              } else {
                console.error(`[BalancePromoter] USDC send failed for tx ${tx.id}: ${result.error}`);
                // Funds stay as 'available' — worker can manually withdraw later
                transferSucceeded = true;
              }
            } else {
              // If worker doesn't have wallet set up, funds stay as 'available'
              console.log(`[BalancePromoter] USDC transaction ${tx.id} promoted to available — worker can withdraw via wallet`);
              transferSucceeded = true;
            }
          } catch (transferError) {
            console.error(`[BalancePromoter] USDC auto-transfer failed for tx ${tx.id}:`, transferError.message);
            // Funds stay as 'available' — worker can manually withdraw later
            transferSucceeded = true;
          }
        }

        // Update task status to 'paid' AFTER transfer attempt (or confirmation funds are available)
        // TODO: PR4 — insert status history row here
        if (transferSucceeded) {
          await supabase
            .from('tasks')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', tx.task_id)
            .in('status', ['approved', 'completed']);
        }
        // Funds stay as 'available' if no matching payout method is set up — worker can manually withdraw later

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
