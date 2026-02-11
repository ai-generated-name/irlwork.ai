const { v4: uuidv4 } = require('uuid');

/**
 * Payment Service - Handles payment release with 48-hour dispute window
 *
 * New flow:
 * 1. Task approved → funds go to pending_transactions (status='pending')
 * 2. 48-hour wait period for disputes
 * 3. Cron job promotes to 'available' status
 * 4. Human can withdraw once status='available'
 */

/**
 * Release payment to pending balance with 48-hour dispute window
 * @param {object} supabase - Supabase client
 * @param {string} taskId - Task ID
 * @param {string} humanId - Human user ID
 * @param {string} agentId - Agent user ID
 * @param {function} createNotification - Notification function
 * @returns {object} Payment release result
 */
async function releasePaymentToPending(supabase, taskId, humanId, agentId, createNotification) {
  const PLATFORM_FEE_PERCENT = 15;

  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error('Task not found');
  }

  const escrowAmount = task.escrow_amount || task.budget || 50;

  // Calculate fees
  const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
  const netAmount = escrowAmount - platformFee;

  // Convert to cents for database storage
  const netAmountCents = Math.round(netAmount * 100);
  const platformFeeCents = Math.round(platformFee * 100);

  // Calculate clears_at timestamp (48 hours from now)
  const clearsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Insert into pending_transactions (funds held for 48-hour dispute window)
  const { data: pendingTx, error: pendingError } = await supabase
    .from('pending_transactions')
    .insert({
      id: uuidv4(),
      user_id: humanId,
      task_id: taskId,
      amount_cents: netAmountCents,
      status: 'pending',
      payout_method: 'stripe',
      clears_at: clearsAt.toISOString(),
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (pendingError) {
    console.error('Error creating pending transaction:', pendingError);
    throw new Error('Failed to create pending transaction');
  }

  // Update task escrow status — atomic guard prevents double-release
  const { data: releasedTask, error: releaseError } = await supabase
    .from('tasks')
    .update({
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .in('escrow_status', ['deposited', 'held'])
    .select('id')
    .single();

  if (releaseError || !releasedTask) {
    throw new Error('Payment has already been released or is in a disputed state');
  }

  // Record payout (Stripe transfer will happen after 48-hour hold)
  await supabase.from('payouts').insert({
    id: uuidv4(),
    task_id: taskId,
    human_id: humanId,
    amount_cents: netAmountCents,
    fee_cents: platformFeeCents,
    payout_method: 'stripe',
    status: 'pending',
    created_at: new Date().toISOString()
  });

  // NOTE: Previously inserted into a 'transactions' table that doesn't exist.
  // Transaction data is already tracked via payouts + pending_transactions tables.

  // Update human stats (atomic increment via RPC to prevent lost updates)
  await supabase.rpc('increment_user_stat', { user_id_param: humanId, stat_name: 'jobs_completed', increment_by: 1 });
  await supabase.rpc('increment_user_stat', { user_id_param: humanId, stat_name: 'total_tasks_completed', increment_by: 1 });
  await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', humanId);

  // Update agent's total paid (atomic increment)
  await supabase.rpc('increment_user_stat', { user_id_param: agentId, stat_name: 'total_usdc_paid', increment_by: netAmount });
  await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', agentId);

  // Notify human about pending payment with 48-hour hold
  if (createNotification) {
    await createNotification(
      humanId,
      'payment_pending',
      'Payment Released - Pending Clearance',
      `Your payment of $${netAmount.toFixed(2)} has been released and will be available for withdrawal on ${clearsAt.toLocaleDateString()} at ${clearsAt.toLocaleTimeString()}. This 48-hour hold period allows for dispute resolution.`
    );
  }

  return {
    success: true,
    amount: escrowAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    status: 'pending',
    clears_at: clearsAt.toISOString(),
    message: 'Payment released to pending balance with 48-hour dispute window',
    pending_transaction_id: pendingTx.id
  };
}

/**
 * Get user's wallet balance breakdown (pending + available)
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {object} Balance breakdown
 */
async function getWalletBalance(supabase, userId) {
  const { data: transactions, error } = await supabase
    .from('pending_transactions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'available']);

  if (error) {
    console.error('Error fetching wallet balance:', error);
    return {
      pending_cents: 0,
      available_cents: 0,
      total_cents: 0,
      pending: 0,
      available: 0,
      total: 0
    };
  }

  const pending_cents = transactions
    .filter(tx => tx.status === 'pending')
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const available_cents = transactions
    .filter(tx => tx.status === 'available')
    .reduce((sum, tx) => sum + tx.amount_cents, 0);

  const total_cents = pending_cents + available_cents;

  return {
    pending_cents,
    available_cents,
    total_cents,
    pending: pending_cents / 100,
    available: available_cents / 100,
    total: total_cents / 100,
    transactions: transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount_cents / 100,
      status: tx.status,
      created_at: tx.created_at,
      clears_at: tx.clears_at,
      task_id: tx.task_id
    }))
  };
}

module.exports = {
  releasePaymentToPending,
  getWalletBalance
};
