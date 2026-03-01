const { v4: uuidv4 } = require('uuid');

/**
 * USDC Withdrawal Service - Handles worker withdrawals via Circle Programmable Wallets
 *
 * Workers can withdraw USDC from their Circle wallet to an external wallet address.
 * Uses Circle's transferUSDC (Gas Station covers fees — never deducted from user).
 *
 * Two paths:
 * 1. Circle wallet → external address (worker has a Circle wallet with balance)
 * 2. Legacy pending_transactions → external address (old Stripe-funded USDC payouts)
 */

/**
 * Process withdrawal via Circle transfer from worker's Circle wallet.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID requesting withdrawal
 * @param {number} amountCents - Amount to withdraw in cents (optional, defaults to all available USDC)
 * @param {function} createNotification - Notification function
 * @returns {object} Withdrawal result
 */
async function processUsdcWithdrawal(supabase, userId, amountCents = null, createNotification) {
  try {
    let circleService;
    try {
      circleService = require('./circleService');
    } catch (e) {
      throw new Error('Circle service not configured. USDC withdrawals are temporarily unavailable.');
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address, circle_wallet_id, circle_wallet_address, usdc_available_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found.');
    }

    // Determine withdrawal destination (worker's external wallet address)
    const destinationAddress = user.wallet_address;
    if (!destinationAddress || !/^0x[a-fA-F0-9]{40}$/.test(destinationAddress)) {
      throw new Error('No valid wallet address set. Please save your Base wallet address first.');
    }

    // Check if user has Circle wallet with balance
    if (user.circle_wallet_id && parseFloat(user.usdc_available_balance || '0') > 0) {
      return await processCircleWithdrawal(supabase, userId, user, destinationAddress, amountCents, circleService, createNotification);
    }

    // Fallback: legacy pending_transactions path
    return await processLegacyWithdrawal(supabase, userId, user, destinationAddress, amountCents, circleService, createNotification);

  } catch (error) {
    console.error('[USDC Withdrawal] Error:', error.message);
    throw error;
  }
}

/**
 * Withdraw from Circle wallet to external address.
 */
async function processCircleWithdrawal(supabase, userId, user, destinationAddress, amountCents, circleService, createNotification) {
  const availableBalance = parseFloat(user.usdc_available_balance || '0');
  const withdrawAmountUSDC = amountCents ? amountCents / 100 : availableBalance;

  if (withdrawAmountUSDC <= 0) {
    throw new Error('No available USDC balance to withdraw.');
  }

  if (withdrawAmountUSDC > availableBalance) {
    throw new Error(`Insufficient USDC balance. Available: $${availableBalance.toFixed(2)}`);
  }

  const idempotencyKey = `withdrawal-${userId}-${Date.now()}`;

  // Transfer from user's Circle wallet to their external address
  const transferResult = await circleService.transferUSDC({
    fromWalletId: user.circle_wallet_id,
    toAddress: destinationAddress,
    amount: withdrawAmountUSDC,
    idempotencyKey,
  });

  // Update user's available balance
  const newBalance = availableBalance - withdrawAmountUSDC;
  await supabase
    .from('users')
    .update({ usdc_available_balance: newBalance })
    .eq('id', userId);

  // Record in ledger
  await supabase
    .from('usdc_ledger')
    .insert({
      user_id: userId,
      type: 'withdrawal',
      amount: -withdrawAmountUSDC,
      balance_after: newBalance,
      circle_transaction_id: transferResult.transactionId,
      description: `Withdrawal of ${withdrawAmountUSDC.toFixed(2)} USDC to ${destinationAddress}`,
    });

  // Create withdrawal record
  const actualAmountCents = Math.round(withdrawAmountUSDC * 100);
  await supabase
    .from('withdrawals')
    .insert({
      id: uuidv4(),
      user_id: userId,
      amount_cents: actualAmountCents,
      payout_method: 'usdc',
      wallet_address: destinationAddress,
      tx_hash: transferResult.txHash || transferResult.transactionId,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

  if (createNotification) {
    await createNotification(
      userId,
      'withdrawal_completed',
      'USDC Withdrawal Sent!',
      `${withdrawAmountUSDC.toFixed(2)} USDC has been sent to your wallet on Base.`,
      '/payments'
    );
  }

  return {
    success: true,
    amount: withdrawAmountUSDC,
    amount_cents: actualAmountCents,
    payout_method: 'usdc',
    circle_transaction_id: transferResult.transactionId,
    tx_hash: transferResult.txHash,
    explorer_url: transferResult.txHash ? `https://basescan.org/tx/${transferResult.txHash}` : null,
    message: `${withdrawAmountUSDC.toFixed(2)} USDC sent to ${destinationAddress}. Transaction should confirm within a few minutes.`,
  };
}

/**
 * Legacy withdrawal path: mark pending_transactions as withdrawn and transfer via Circle.
 * Used for USDC balances from Stripe-funded tasks that were paid out in USDC.
 */
async function processLegacyWithdrawal(supabase, userId, user, destinationAddress, amountCents, circleService, createNotification) {
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

  // Use Circle escrow wallet to send (platform holds these funds)
  const escrowWalletId = process.env.CIRCLE_ESCROW_WALLET_ID;
  if (!escrowWalletId) {
    throw new Error('Circle escrow wallet not configured for legacy withdrawals.');
  }

  const idempotencyKey = `legacy-withdrawal-${userId}-${Date.now()}`;
  const transferResult = await circleService.transferUSDC({
    fromWalletId: escrowWalletId,
    toAddress: destinationAddress,
    amount: actualAmountUSDC,
    idempotencyKey,
  });

  // Mark transactions as withdrawn
  for (const tx of txsToWithdraw) {
    await supabase
      .from('pending_transactions')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        notes: `Circle tx: ${transferResult.transactionId}`,
      })
      .eq('id', tx.id)
      .eq('status', 'available');
  }

  // Create withdrawal record
  await supabase
    .from('withdrawals')
    .insert({
      id: uuidv4(),
      user_id: userId,
      amount_cents: actualAmountCents,
      payout_method: 'usdc',
      wallet_address: destinationAddress,
      tx_hash: transferResult.txHash || transferResult.transactionId,
      status: 'completed',
      transaction_ids: txsToWithdraw.map(tx => tx.id),
      created_at: new Date().toISOString(),
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
    circle_transaction_id: transferResult.transactionId,
    tx_hash: transferResult.txHash,
    explorer_url: transferResult.txHash ? `https://basescan.org/tx/${transferResult.txHash}` : null,
    transactions_withdrawn: txsToWithdraw.length,
    message: `${actualAmountUSDC.toFixed(2)} USDC sent to ${destinationAddress}. Transaction should confirm within a few minutes.`,
  };
}

module.exports = {
  processUsdcWithdrawal,
};
