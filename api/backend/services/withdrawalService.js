const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Withdrawal Service - Handles human withdrawals from available balance
 *
 * Humans can only withdraw funds that have status='available' in pending_transactions
 * (i.e., funds that have passed the 48-hour dispute window)
 */

/**
 * Process withdrawal request from human
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID requesting withdrawal
 * @param {number} amountCents - Amount to withdraw in cents (optional, defaults to all available)
 * @param {function} sendUSDC - Function to send USDC (from wallet.js)
 * @param {function} createNotification - Notification function
 * @returns {object} Withdrawal result
 */
async function processWithdrawal(supabase, userId, amountCents = null, sendUSDC, createNotification) {
  try {
    // Get user's wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user?.wallet_address) {
      throw new Error('User has no wallet address configured');
    }

    // Get all available balance for this user
    const { data: availableTxs, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .order('created_at', { ascending: true }); // FIFO withdrawal

    if (txError) {
      throw new Error('Failed to fetch available balance');
    }

    if (!availableTxs || availableTxs.length === 0) {
      throw new Error('No available balance to withdraw');
    }

    // Calculate total available
    const totalAvailableCents = availableTxs.reduce((sum, tx) => sum + tx.amount_cents, 0);

    // If no amount specified, withdraw all available
    const withdrawAmountCents = amountCents || totalAvailableCents;

    if (withdrawAmountCents > totalAvailableCents) {
      throw new Error(`Insufficient available balance. Available: $${(totalAvailableCents / 100).toFixed(2)}, Requested: $${(withdrawAmountCents / 100).toFixed(2)}`);
    }

    if (withdrawAmountCents <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Select transactions to withdraw (FIFO)
    let remainingToWithdraw = withdrawAmountCents;
    const txsToWithdraw = [];

    for (const tx of availableTxs) {
      if (remainingToWithdraw <= 0) break;

      if (tx.amount_cents <= remainingToWithdraw) {
        // Withdraw entire transaction
        txsToWithdraw.push({ ...tx, withdrawAmount: tx.amount_cents });
        remainingToWithdraw -= tx.amount_cents;
      } else {
        // Partial withdrawal (not implemented in this version - withdraw full amounts only)
        // For now, we only support withdrawing full transaction amounts
        break;
      }
    }

    const actualWithdrawAmountCents = txsToWithdraw.reduce((sum, tx) => sum + tx.withdrawAmount, 0);
    const actualWithdrawAmount = actualWithdrawAmountCents / 100;

    // Send USDC to human's wallet
    let txHash = null;

    if (sendUSDC && process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      try {
        console.log(`[Withdrawal] Sending ${actualWithdrawAmount} USDC to ${user.wallet_address}`);
        txHash = await sendUSDC(user.wallet_address, actualWithdrawAmount);
        console.log(`[Withdrawal] Transaction hash: ${txHash}`);
      } catch (error) {
        console.error('[Withdrawal] Blockchain transaction failed:', error);
        throw new Error('Failed to send USDC. Please try again later.');
      }
    } else {
      // Simulated mode (no wallet configured)
      console.log(`[SIMULATED] Withdrawal: Sending ${actualWithdrawAmount} USDC to ${user.wallet_address}`);
      txHash = '0x' + crypto.randomBytes(32).toString('hex');
    }

    // Mark transactions as withdrawn with status precondition to prevent double-withdrawal
    const withdrawnAt = new Date().toISOString();
    let actuallyWithdrawn = 0;

    for (const tx of txsToWithdraw) {
      const { data: updated, error: updateErr } = await supabase
        .from('pending_transactions')
        .update({
          status: 'withdrawn',
          withdrawn_at: withdrawnAt,
          notes: `Withdrawn via tx: ${txHash}`
        })
        .eq('id', tx.id)
        .eq('status', 'available')
        .select('id')
        .single();

      if (updateErr || !updated) {
        console.warn(`[Withdrawal] Transaction ${tx.id} already withdrawn or status changed, skipping`);
        continue;
      }

      actuallyWithdrawn++;

      // Update corresponding payout with tx_hash
      await supabase
        .from('payouts')
        .update({
          status: 'completed',
          tx_hash: txHash
        })
        .eq('task_id', tx.task_id)
        .eq('human_id', userId);
    }

    if (actuallyWithdrawn === 0) {
      throw new Error('Withdrawal already processed. No transactions were available.');
    }

    // Create withdrawal record for audit trail
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        id: uuidv4(),
        user_id: userId,
        amount_cents: actualWithdrawAmountCents,
        wallet_address: user.wallet_address,
        tx_hash: txHash,
        status: 'completed',
        transaction_ids: txsToWithdraw.map(tx => tx.id),
        created_at: withdrawnAt
      })
      .select()
      .single();

    // Send notification
    if (createNotification) {
      await createNotification(
        userId,
        'withdrawal_completed',
        'Withdrawal Successful!',
        `$${actualWithdrawAmount.toFixed(2)} USDC has been sent to your wallet.`,
        `/wallet`
      );
    }

    return {
      success: true,
      amount: actualWithdrawAmount,
      amount_cents: actualWithdrawAmountCents,
      tx_hash: txHash,
      wallet_address: user.wallet_address,
      transactions_withdrawn: txsToWithdraw.length,
      message: 'Withdrawal processed successfully'
    };

  } catch (error) {
    console.error('[Withdrawal] Error:', error.message);
    throw error;
  }
}

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
    tx_hash: w.tx_hash,
    created_at: w.created_at,
    wallet_address: w.wallet_address
  }));
}

/**
 * Process withdrawal via Stripe Transfer (for workers with Connect accounts)
 * Same FIFO pattern as processWithdrawal but transfers via Stripe instead of USDC.
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

    // Get available Stripe-method transactions
    const { data: availableTxs, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .eq('payout_method', 'stripe')
      .order('created_at', { ascending: true }); // FIFO

    if (txError) throw new Error('Failed to fetch available balance');

    if (!availableTxs || availableTxs.length === 0) {
      throw new Error('No available Stripe balance to withdraw');
    }

    const totalAvailableCents = availableTxs.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const withdrawAmountCents = amountCents || totalAvailableCents;

    if (withdrawAmountCents > totalAvailableCents) {
      throw new Error(`Insufficient available balance. Available: $${(totalAvailableCents / 100).toFixed(2)}`);
    }

    // Select transactions to withdraw (FIFO, full amounts only)
    let remaining = withdrawAmountCents;
    const txsToWithdraw = [];

    for (const tx of availableTxs) {
      if (remaining <= 0) break;
      if (tx.amount_cents <= remaining) {
        txsToWithdraw.push(tx);
        remaining -= tx.amount_cents;
      } else {
        break;
      }
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
  processWithdrawal,
  processStripeWithdrawal,
  getWithdrawalHistory
};
