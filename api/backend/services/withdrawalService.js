const { v4: uuidv4 } = require('uuid');

/**
 * Withdrawal Service - Handles worker withdrawals via Stripe Connect
 *
 * Workers can only withdraw funds that have status='available' in pending_transactions
 * (i.e., funds that have passed the 48-hour dispute window)
 *
 * All withdrawals go through Stripe Connect transfers to the worker's bank account.
 */

/**
 * Get withdrawal history for user
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {array} Withdrawal history
 */
async function getWithdrawalHistory(supabase, userId) {
  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Withdrawal] Error fetching history:', error);
    return [];
  }

  return withdrawals.map(w => ({
    id: w.id,
    amount: w.amount_cents / 100,
    status: w.status,
    stripe_transfer_id: w.stripe_transfer_id,
    payout_method: w.payout_method || 'stripe',
    created_at: w.created_at
  }));
}

/**
 * Process withdrawal via Stripe Transfer to worker's connected bank account.
 * Uses FIFO ordering (oldest available balance first).
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID requesting withdrawal
 * @param {number} amountCents - Amount to withdraw in cents (optional, defaults to all available)
 * @param {function} createNotification - Notification function
 * @returns {object} Withdrawal result
 */
async function processStripeWithdrawal(supabase, userId, amountCents = null, createNotification) {
  try {
    const { transferToWorker, getConnectAccountStatus } = require('./stripeService');

    // Get user's Stripe account
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_account_id) {
      throw new Error('No bank account connected. Please set up Stripe Connect first.');
    }

    // Verify Connect account is active
    const connectStatus = await getConnectAccountStatus(user.stripe_account_id);
    if (!connectStatus.payouts_enabled) {
      throw new Error('Stripe Connect onboarding is not complete. Please finish setting up your bank account.');
    }

    // Get available transactions (all are Stripe now)
    const { data: availableTxs, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .order('created_at', { ascending: true }); // FIFO

    if (txError) throw new Error('Failed to fetch available balance');

    if (!availableTxs || availableTxs.length === 0) {
      throw new Error('No available balance to withdraw');
    }

    const totalAvailableCents = availableTxs.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const withdrawAmountCents = amountCents || totalAvailableCents;

    if (withdrawAmountCents > totalAvailableCents) {
      throw new Error(`Insufficient available balance. Available: $${(totalAvailableCents / 100).toFixed(2)}`);
    }

    // Select transactions to withdraw (FIFO, full amounts only — skip any too large, continue to smaller ones)
    let remaining = withdrawAmountCents;
    const txsToWithdraw = [];

    for (const tx of availableTxs) {
      if (remaining <= 0) break;
      if (tx.amount_cents <= remaining) {
        txsToWithdraw.push(tx);
        remaining -= tx.amount_cents;
      }
      // Skip transactions larger than remaining — continue to check smaller ones
    }

    const actualAmountCents = txsToWithdraw.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const actualAmount = actualAmountCents / 100;

    // Create Stripe transfers for each transaction
    const transferIds = [];
    for (const tx of txsToWithdraw) {
      const result = await transferToWorker(
        supabase, tx.id, user.stripe_account_id, tx.amount_cents, tx.task_id
      );
      transferIds.push(result.transfer_id);

      // Mark transaction as withdrawn with status precondition
      const { data: updated, error: updateErr } = await supabase
        .from('pending_transactions')
        .update({
          status: 'withdrawn',
          stripe_transfer_id: result.transfer_id,
          withdrawn_at: new Date().toISOString(),
          notes: `Stripe transfer: ${result.transfer_id}`
        })
        .eq('id', tx.id)
        .eq('status', 'available')
        .select('id')
        .single();

      if (updateErr || !updated) {
        console.warn(`[Stripe Withdrawal] Transaction ${tx.id} already withdrawn, skipping`);
        continue;
      }
    }

    // Create withdrawal record
    const withdrawnAt = new Date().toISOString();
    await supabase
      .from('withdrawals')
      .insert({
        id: uuidv4(),
        user_id: userId,
        amount_cents: actualAmountCents,
        payout_method: 'stripe',
        stripe_transfer_id: transferIds[0] || null,
        status: 'completed',
        transaction_ids: txsToWithdraw.map(tx => tx.id),
        created_at: withdrawnAt
      });

    if (createNotification) {
      await createNotification(
        userId,
        'withdrawal_completed',
        'Bank Deposit Initiated!',
        `$${actualAmount.toFixed(2)} is being deposited to your bank account.`,
        '/payments'
      );
    }

    return {
      success: true,
      amount: actualAmount,
      amount_cents: actualAmountCents,
      payout_method: 'stripe',
      transfer_ids: transferIds,
      transactions_withdrawn: txsToWithdraw.length,
      message: 'Stripe transfer initiated. Funds will arrive in your bank account within 2-3 business days.'
    };

  } catch (error) {
    console.error('[Stripe Withdrawal] Error:', error.message);
    throw error;
  }
}

module.exports = {
  processWithdrawal: processStripeWithdrawal, // Backward compat alias
  processStripeWithdrawal,
  getWithdrawalHistory
};
