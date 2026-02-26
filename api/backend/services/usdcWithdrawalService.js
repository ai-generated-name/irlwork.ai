const { v4: uuidv4 } = require('uuid');

/**
 * USDC Withdrawal Service - Handles worker withdrawals via on-chain USDC transfer
 *
 * Workers can only withdraw USDC-funded transactions that have status='available'
 * (i.e., funds that have passed the 48-hour dispute window and were funded via USDC).
 *
 * Withdrawals are sent as USDC on Base to the worker's saved wallet address.
 */

/**
 * Process withdrawal via on-chain USDC transfer to worker's wallet address.
 * Uses FIFO ordering (oldest available balance first).
 * Only processes transactions with payout_method='usdc'.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID requesting withdrawal
 * @param {number} amountCents - Amount to withdraw in cents (optional, defaults to all available USDC)
 * @param {function} createNotification - Notification function
 * @returns {object} Withdrawal result
 */
async function processUsdcWithdrawal(supabase, userId, amountCents = null, createNotification) {
  try {
    const { sendUSDC, isValidAddress } = require('../lib/wallet');

    // Get user's wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user?.wallet_address) {
      throw new Error('No wallet address set. Please save your Base wallet address first.');
    }

    if (!isValidAddress(user.wallet_address)) {
      throw new Error('Invalid wallet address on file. Please update your wallet address.');
    }

    // Get available USDC-funded transactions only
    const { data: availableTxs, error: txError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .eq('payout_method', 'usdc')
      .order('created_at', { ascending: true }); // FIFO

    if (txError) throw new Error('Failed to fetch available USDC balance');

    if (!availableTxs || availableTxs.length === 0) {
      throw new Error('No available USDC balance to withdraw');
    }

    const totalAvailableCents = availableTxs.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const withdrawAmountCents = amountCents || totalAvailableCents;

    if (amountCents !== null) {
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new Error('Withdrawal amount must be a positive integer (in cents)');
      }
    }

    if (withdrawAmountCents > totalAvailableCents) {
      throw new Error(`Insufficient available USDC balance. Available: $${(totalAvailableCents / 100).toFixed(2)}`);
    }

    if (withdrawAmountCents <= 0) {
      throw new Error('No available USDC balance to withdraw');
    }

    // Select transactions to withdraw (FIFO, full amounts only)
    let remaining = withdrawAmountCents;
    const txsToWithdraw = [];

    for (const tx of availableTxs) {
      if (remaining <= 0) break;
      if (tx.amount_cents <= remaining) {
        txsToWithdraw.push(tx);
        remaining -= tx.amount_cents;
      }
    }

    const actualAmountCents = txsToWithdraw.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const actualAmountUSDC = actualAmountCents / 100;

    // Send USDC on-chain
    const sendResult = await sendUSDC(user.wallet_address, actualAmountUSDC);

    if (!sendResult.success) {
      throw new Error(`USDC transfer failed: ${sendResult.error}`);
    }

    // Mark transactions as withdrawn
    for (const tx of txsToWithdraw) {
      const { data: updated, error: updateErr } = await supabase
        .from('pending_transactions')
        .update({
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
          notes: `USDC tx: ${sendResult.txHash}`
        })
        .eq('id', tx.id)
        .eq('status', 'available')
        .select('id')
        .single();

      if (updateErr || !updated) {
        console.warn(`[USDC Withdrawal] Transaction ${tx.id} already withdrawn, skipping`);
      }
    }

    // Create withdrawal record
    await supabase
      .from('withdrawals')
      .insert({
        id: uuidv4(),
        user_id: userId,
        amount_cents: actualAmountCents,
        payout_method: 'usdc',
        wallet_address: user.wallet_address,
        tx_hash: sendResult.txHash,
        status: 'completed',
        transaction_ids: txsToWithdraw.map(tx => tx.id),
        created_at: new Date().toISOString()
      });

    if (createNotification) {
      await createNotification(
        userId,
        'withdrawal_completed',
        'USDC Withdrawal Sent!',
        `${actualAmountUSDC.toFixed(2)} USDC has been sent to your wallet on Base.`,
        '/payments'
      );
    }

    return {
      success: true,
      amount: actualAmountUSDC,
      amount_cents: actualAmountCents,
      payout_method: 'usdc',
      tx_hash: sendResult.txHash,
      explorer_url: sendResult.explorerUrl,
      transactions_withdrawn: txsToWithdraw.length,
      message: `${actualAmountUSDC.toFixed(2)} USDC sent to ${user.wallet_address}. Transaction should confirm within a few minutes.`
    };

  } catch (error) {
    console.error('[USDC Withdrawal] Error:', error.message);
    throw error;
  }
}

module.exports = {
  processUsdcWithdrawal
};
