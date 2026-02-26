const { stripe } = require('../lib/stripe');
const { v4: uuidv4 } = require('uuid');

const { PLATFORM_FEE_PERCENT } = require('../../config/constants');

// ============================================================================
// CUSTOMER MANAGEMENT (Agents)
// ============================================================================

/**
 * Get or create a Stripe Customer for an agent.
 * Agents need a Customer to save payment methods for future charges.
 */
async function getOrCreateStripeCustomer(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  // Return existing customer ID if already set
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create new Stripe Customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { user_id: user.id, platform: 'irlwork' }
  });

  // Save to database
  await supabase
    .from('users')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  return customer.id;
}

/**
 * Create a SetupIntent so the agent can save a payment method via Stripe Elements.
 * Returns client_secret for the frontend.
 */
async function createSetupIntent(stripeCustomerId) {
  if (!stripe) throw new Error('Stripe not configured');

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
  });

  return {
    client_secret: setupIntent.client_secret,
    setup_intent_id: setupIntent.id
  };
}

/**
 * List saved payment methods for a Stripe customer.
 */
async function listPaymentMethods(stripeCustomerId) {
  if (!stripe) throw new Error('Stripe not configured');

  const methods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  });

  // Get customer to check default payment method
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const defaultPmId = customer.invoice_settings?.default_payment_method;

  return methods.data.map(pm => ({
    id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    exp_month: pm.card.exp_month,
    exp_year: pm.card.exp_year,
    is_default: pm.id === defaultPmId
  }));
}

/**
 * Delete (detach) a saved payment method.
 */
async function deletePaymentMethod(paymentMethodId) {
  if (!stripe) throw new Error('Stripe not configured');
  await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Set a payment method as the customer's default.
 */
async function setDefaultPaymentMethod(stripeCustomerId, paymentMethodId) {
  if (!stripe) throw new Error('Stripe not configured');

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// ============================================================================
// AGENT CHARGES (Escrow)
// ============================================================================

/**
 * Charge agent immediately for task assignment.
 * Creates and confirms a PaymentIntent using the agent's saved payment method.
 *
 * The full escrow amount is charged to the agent. Platform fee is deducted
 * later at transfer time (when worker gets paid).
 */
async function chargeAgentForTask(supabase, agentId, taskId, amountCents, paymentMethodId) {
  if (!stripe) throw new Error('Stripe not configured');

  // Get agent's Stripe customer
  const { data: agent, error: agentError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent?.stripe_customer_id) {
    throw new Error('Agent has no Stripe payment method set up');
  }

  // If no specific PM provided, use the customer's default
  let pmToUse = paymentMethodId;
  if (!pmToUse) {
    const customer = await stripe.customers.retrieve(agent.stripe_customer_id);
    pmToUse = customer.invoice_settings?.default_payment_method;

    if (!pmToUse) {
      // Fall back to first available payment method
      const methods = await stripe.paymentMethods.list({
        customer: agent.stripe_customer_id,
        type: 'card',
        limit: 1
      });
      pmToUse = methods.data[0]?.id;
    }

    if (!pmToUse) {
      throw new Error('No payment method available. Please add a card first.');
    }
  }

  // Create and confirm PaymentIntent immediately
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: agent.stripe_customer_id,
    payment_method: pmToUse,
    confirm: true,
    off_session: true,
    metadata: {
      task_id: taskId,
      agent_id: agentId,
      platform: 'irlwork'
    },
    description: `irlwork.ai task escrow - ${taskId}`,
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
  }

  return {
    payment_intent_id: paymentIntent.id,
    status: paymentIntent.status,
    amount_cents: amountCents
  };
}

// ============================================================================
// AUTH-HOLD ESCROW (New payment timing model)
// ============================================================================

/**
 * Authorize escrow via manual-capture PaymentIntent (auth hold only — no charge).
 * Money is reserved on the agent's card but NOT captured until the human starts work.
 *
 * @param {object} supabase - Supabase client
 * @param {string} agentId - Agent user ID
 * @param {string} taskId - Task ID
 * @param {number} amountCents - Amount in cents
 * @param {string} [paymentMethodId] - Specific PM to use (optional, falls back to default)
 * @returns {object} { payment_intent_id, status, amount_cents, auth_hold_expires_at } or { requires_action, client_secret, payment_intent_id }
 */
async function authorizeEscrow(supabase, agentId, taskId, amountCents, paymentMethodId) {
  if (!stripe) throw new Error('Stripe not configured');

  // Get agent's Stripe customer
  const { data: agent, error: agentError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent?.stripe_customer_id) {
    throw new Error('Agent has no Stripe payment method set up');
  }

  // If no specific PM provided, use the customer's default
  let pmToUse = paymentMethodId;
  if (!pmToUse) {
    const customer = await stripe.customers.retrieve(agent.stripe_customer_id);
    pmToUse = customer.invoice_settings?.default_payment_method;

    if (!pmToUse) {
      // Fall back to first available payment method
      const methods = await stripe.paymentMethods.list({
        customer: agent.stripe_customer_id,
        type: 'card',
        limit: 1
      });
      pmToUse = methods.data[0]?.id;
    }

    if (!pmToUse) {
      throw new Error('No payment method available. Please add a card first.');
    }
  }

  // Create PaymentIntent with manual capture (auth hold only)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: agent.stripe_customer_id,
    payment_method: pmToUse,
    capture_method: 'manual',
    confirm: true,
    off_session: true,
    metadata: {
      task_id: taskId,
      agent_id: agentId,
      platform: 'irlwork'
    },
    description: `irlwork.ai task escrow (auth hold) - ${taskId}`,
  });

  // Handle 3DS / SCA requirement
  if (paymentIntent.status === 'requires_action') {
    return {
      requires_action: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    };
  }

  // Auth hold successfully placed
  if (paymentIntent.status === 'requires_capture') {
    // 6.5 days from now (buffer before Stripe's 7-day expiry)
    const authHoldExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString();
    return {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount_cents: amountCents,
      auth_hold_expires_at: authHoldExpiresAt
    };
  }

  // Unexpected status
  throw new Error(`Unexpected PaymentIntent status after authorization: ${paymentIntent.status}`);
}

/**
 * Capture a previously authorized escrow hold (charges the agent's card).
 * Called when the human starts work on the task.
 *
 * @param {string} paymentIntentId - Stripe PaymentIntent ID to capture
 * @returns {object} { payment_intent_id, status, amount_captured }
 */
async function captureEscrow(paymentIntentId) {
  if (!stripe) throw new Error('Stripe not configured');

  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new Error(`Escrow capture failed. Status: ${paymentIntent.status}`);
  }

  return {
    payment_intent_id: paymentIntent.id,
    status: paymentIntent.status,
    amount_captured: paymentIntent.amount_received
  };
}

/**
 * Cancel an authorization hold (release reserved funds without charging).
 * Used when a task is cancelled before work starts.
 *
 * @param {string} paymentIntentId - Stripe PaymentIntent ID to cancel
 * @returns {object} { payment_intent_id, status }
 */
async function cancelEscrowHold(paymentIntentId) {
  if (!stripe) throw new Error('Stripe not configured');

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer'
    });
    return {
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status
    };
  } catch (err) {
    // If PI is already cancelled or captured, log and continue (don't throw)
    if (err.code === 'payment_intent_unexpected_state') {
      console.warn(`[cancelEscrowHold] PI ${paymentIntentId} already in terminal state: ${err.message}`);
      return { payment_intent_id: paymentIntentId, status: 'already_terminal' };
    }
    throw err;
  }
}

/**
 * Verify an agent has a valid payment method on file.
 * Used at task creation to ensure the agent can pay before posting.
 *
 * @param {object} supabase - Supabase client
 * @param {string} agentId - Agent user ID
 * @returns {object} { valid: boolean, payment_method_id?: string, reason?: string }
 */
async function verifyAgentHasPaymentMethod(supabase, agentId) {
  if (!stripe) {
    // Graceful degradation when Stripe is not configured (dev/demo mode)
    return { valid: true, reason: 'stripe_disabled' };
  }

  const { data: agent, error: agentError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', agentId)
    .single();

  if (agentError || !agent?.stripe_customer_id) {
    return { valid: false, reason: 'no_payment_method' };
  }

  // Check default PM first
  const customer = await stripe.customers.retrieve(agent.stripe_customer_id);
  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (defaultPm) {
    return { valid: true, payment_method_id: defaultPm };
  }

  // Fall back to listing PMs
  const methods = await stripe.paymentMethods.list({
    customer: agent.stripe_customer_id,
    type: 'card',
    limit: 1
  });

  if (methods.data.length > 0) {
    return { valid: true, payment_method_id: methods.data[0].id };
  }

  return { valid: false, reason: 'no_payment_method' };
}

// ============================================================================
// STRIPE CONNECT (Workers)
// ============================================================================

/**
 * Create a Stripe Connect Express account for a worker.
 * Returns the account ID and onboarding URL.
 */
async function createConnectAccount(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  // If user already has an account, just create a new account link
  if (user.stripe_account_id) {
    const onboardingUrl = await createAccountLink(user.stripe_account_id);
    return { account_id: user.stripe_account_id, onboarding_url: onboardingUrl };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      user_id: user.id,
      platform: 'irlwork'
    }
  });

  // Save to database
  await supabase
    .from('users')
    .update({
      stripe_account_id: account.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // Create onboarding link
  const onboardingUrl = await createAccountLink(account.id);

  return { account_id: account.id, onboarding_url: onboardingUrl };
}

/**
 * Generate an Account Link URL for Stripe Connect onboarding.
 * Used when a worker needs to start or resume onboarding.
 */
async function createAccountLink(stripeAccountId) {
  if (!stripe) throw new Error('Stripe not configured');

  const baseUrl = process.env.FRONTEND_URL || 'https://www.irlwork.ai';

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${baseUrl}?tab=payments&stripe_onboard=refresh`,
    return_url: `${baseUrl}?tab=payments&stripe_onboard=complete`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Check if a Connect account is fully onboarded and payouts enabled.
 */
async function getConnectAccountStatus(stripeAccountId) {
  if (!stripe) throw new Error('Stripe not configured');

  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  };
}

/**
 * Generate a login link for the worker's Stripe Express Dashboard.
 * Allows workers to manage bank accounts, view payouts, update tax info.
 */
async function createLoginLink(stripeAccountId) {
  if (!stripe) throw new Error('Stripe not configured');

  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink.url;
}

// ============================================================================
// TRANSFERS (Platform → Worker)
// ============================================================================

/**
 * Transfer funds from platform to worker's connected account.
 * Called after 48-hour hold clears for Stripe-paid tasks.
 */
async function transferToWorker(supabase, pendingTransactionId, workerStripeAccountId, amountCents, taskId) {
  if (!stripe) throw new Error('Stripe not configured');

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: workerStripeAccountId,
    metadata: {
      pending_transaction_id: pendingTransactionId,
      task_id: taskId,
      platform: 'irlwork'
    },
    description: `irlwork.ai payout - task ${taskId}`,
  }, {
    idempotencyKey: `payout-${pendingTransactionId}`
  });

  // Update pending_transaction with transfer ID
  await supabase
    .from('pending_transactions')
    .update({ stripe_transfer_id: transfer.id })
    .eq('id', pendingTransactionId);

  return {
    transfer_id: transfer.id,
    status: transfer.reversed ? 'reversed' : 'created'
  };
}

// ============================================================================
// REFUNDS
// ============================================================================

/**
 * Refund a PaymentIntent directly by ID (no DB lookup).
 * Used for immediate rollbacks, e.g. when a race condition causes a duplicate charge.
 */
async function refundPaymentIntent(paymentIntentId, reason = 'duplicate') {
  if (!stripe) throw new Error('Stripe not configured');

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason,
    metadata: { platform: 'irlwork', reason }
  });

  return { refund_id: refund.id, status: refund.status, amount: refund.amount };
}

/**
 * Refund a payment to the agent's card by task ID.
 * Used when disputes are resolved in the agent's favor or tasks are cancelled.
 */
async function refundPayment(supabase, taskId, reason = 'requested_by_customer') {
  if (!stripe) throw new Error('Stripe not configured');

  // Get the payment intent ID from the task
  const { data: task } = await supabase
    .from('tasks')
    .select('stripe_payment_intent_id, escrow_status')
    .eq('id', taskId)
    .single();

  if (!task?.stripe_payment_intent_id) {
    throw new Error('No Stripe payment found for this task');
  }

  if (task.escrow_status === 'refunded') {
    throw new Error('Payment has already been refunded');
  }

  // Atomic guard: mark as refunded BEFORE calling Stripe to prevent double-refund
  const { data: updated, error: updateErr } = await supabase
    .from('tasks')
    .update({
      escrow_status: 'refunded',
      escrow_refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .neq('escrow_status', 'refunded')
    .select('id')
    .single();

  if (updateErr || !updated) {
    throw new Error('Payment has already been refunded');
  }

  const refund = await stripe.refunds.create({
    payment_intent: task.stripe_payment_intent_id,
    reason,
    metadata: {
      task_id: taskId,
      platform: 'irlwork'
    }
  });

  return {
    refund_id: refund.id,
    status: refund.status,
    amount: refund.amount
  };
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Process a Stripe webhook event with idempotency.
 * Events are recorded AFTER processing to ensure retry on failure.
 */
async function handleWebhookEvent(event, supabase, createNotification) {
  // Atomic idempotency: INSERT first, rely on unique constraint to prevent duplicates.
  // This avoids the TOCTOU race of SELECT-then-INSERT.
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({
      id: event.id,
      type: event.type,
      processed_at: null // Mark as in-progress
    });

  if (insertError) {
    // Unique constraint violation means event was already claimed
    if (insertError.code === '23505') {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
      return;
    }
    console.error(`[Stripe Webhook] Failed to claim event ${event.id}:`, insertError.message);
    throw insertError;
  }

  // Process the event, then mark as processed
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object, supabase, createNotification);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object, supabase, createNotification);
      break;

    case 'account.updated':
      await handleAccountUpdated(event.data.object, supabase);
      break;

    case 'transfer.created':
      await handleTransferCreated(event.data.object, supabase);
      break;

    case 'transfer.reversed':
      await handleTransferFailed(event.data.object, supabase, createNotification);
      break;

    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object, supabase, createNotification);
      break;

    case 'charge.dispute.closed':
      await handleDisputeClosed(event.data.object, supabase, createNotification);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object, supabase);
      break;

    case 'payout.failed':
      await handlePayoutFailed(event.data.object, event.account, supabase, createNotification);
      break;

    case 'payout.paid':
      await handlePayoutPaid(event.data.object, event.account, supabase, createNotification);
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  // Mark as processed after successful handling
  await supabase.from('stripe_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', event.id);
}

async function handlePaymentIntentSucceeded(paymentIntent, supabase, createNotification) {
  const taskId = paymentIntent.metadata?.task_id;
  const agentId = paymentIntent.metadata?.agent_id;

  if (!taskId) return;

  console.log(`[Stripe Webhook] PaymentIntent succeeded for task ${taskId}`);

  // Idempotent: task may already be updated from the synchronous charge
  const { data: task } = await supabase
    .from('tasks')
    .select('escrow_status')
    .eq('id', taskId)
    .single();

  if (task && task.escrow_status !== 'deposited') {
    await supabase
      .from('tasks')
      .update({
        escrow_status: 'deposited',
        escrow_deposited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
  }
}

async function handlePaymentIntentFailed(paymentIntent, supabase, createNotification) {
  const taskId = paymentIntent.metadata?.task_id;
  const agentId = paymentIntent.metadata?.agent_id;

  if (!taskId || !agentId) return;

  console.error(`[Stripe Webhook] PaymentIntent failed for task ${taskId}: ${paymentIntent.last_payment_error?.message}`);

  // Notify agent
  if (createNotification) {
    await createNotification(
      agentId,
      'payment_failed',
      'Payment Failed',
      `Your payment for a task failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}. Please update your payment method.`,
      null
    );
  }
}

async function handleAccountUpdated(account, supabase) {
  // Find user by stripe_account_id
  const { data: user } = await supabase
    .from('users')
    .select('id, stripe_onboarding_complete')
    .eq('stripe_account_id', account.id)
    .single();

  if (!user) return;

  // Update onboarding status
  const isComplete = account.details_submitted && account.payouts_enabled;

  if (isComplete && !user.stripe_onboarding_complete) {
    await supabase
      .from('users')
      .update({
        stripe_onboarding_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    console.log(`[Stripe Webhook] Connect onboarding complete for user ${user.id}`);
  }
}

async function handleTransferCreated(transfer, supabase) {
  const pendingTxId = transfer.metadata?.pending_transaction_id;
  if (!pendingTxId) return;

  console.log(`[Stripe Webhook] Transfer created: ${transfer.id} for pending tx ${pendingTxId}`);

  await supabase
    .from('pending_transactions')
    .update({ stripe_transfer_id: transfer.id })
    .eq('id', pendingTxId);
}

async function handleTransferFailed(transfer, supabase, createNotification) {
  const pendingTxId = transfer.metadata?.pending_transaction_id;
  const taskId = transfer.metadata?.task_id;

  if (!pendingTxId) return;

  console.error(`[Stripe Webhook] Transfer reversed/failed: ${transfer.id}`);

  // Revert pending_transaction back to 'available' so worker can retry
  await supabase
    .from('pending_transactions')
    .update({
      status: 'available',
      stripe_transfer_id: null,
      notes: `Transfer ${transfer.id} was reversed — funds reverted to available`
    })
    .eq('id', pendingTxId)
    .eq('status', 'withdrawn'); // Only revert if it was marked withdrawn

  // Get the worker from pending_transaction
  const { data: pendingTx } = await supabase
    .from('pending_transactions')
    .select('user_id')
    .eq('id', pendingTxId)
    .single();

  if (pendingTx && createNotification) {
    await createNotification(
      pendingTx.user_id,
      'transfer_failed',
      'Payout Failed',
      'Your bank payout could not be completed. Your funds are available for withdrawal — please verify your bank account details and try again.',
      '/payments'
    );
  }
}

// ============================================================================
// DISPUTE HANDLING
// ============================================================================

/**
 * Handle charge.dispute.created — freeze pending_transactions so worker can't withdraw
 */
async function handleDisputeCreated(dispute, supabase, createNotification) {
  const chargeId = dispute.charge;
  if (!chargeId) return;

  console.error(`[Stripe Webhook] Dispute created: ${dispute.id} for charge ${chargeId}`);

  // Find the charge to get the payment intent
  let paymentIntentId;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = charge.payment_intent;
  } catch (e) {
    console.error(`[Stripe Webhook] Could not retrieve charge ${chargeId}:`, e.message);
    return;
  }

  if (!paymentIntentId) return;

  // Find the task by payment intent
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!task) {
    console.error(`[Stripe Webhook] No task found for payment_intent ${paymentIntentId}`);
    return;
  }

  // Freeze all pending_transactions for this task
  await supabase
    .from('pending_transactions')
    .update({
      status: 'frozen',
      notes: `Frozen due to dispute ${dispute.id}`
    })
    .eq('task_id', task.id)
    .in('status', ['pending', 'available']);

  // Also freeze payouts
  await supabase
    .from('payouts')
    .update({ status: 'frozen' })
    .eq('task_id', task.id)
    .in('status', ['pending', 'available']);

  // Update task
  await supabase
    .from('tasks')
    .update({
      escrow_status: 'disputed',
      updated_at: new Date().toISOString()
    })
    .eq('id', task.id);

  console.log(`[Stripe Webhook] Froze funds for task ${task.id} due to dispute ${dispute.id}`);
}

/**
 * Handle charge.dispute.closed — resolve based on outcome
 */
async function handleDisputeClosed(dispute, supabase, createNotification) {
  const chargeId = dispute.charge;
  if (!chargeId) return;

  console.log(`[Stripe Webhook] Dispute closed: ${dispute.id}, status: ${dispute.status}`);

  let paymentIntentId;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = charge.payment_intent;
  } catch (e) {
    return;
  }

  if (!paymentIntentId) return;

  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (!task) return;

  if (dispute.status === 'won') {
    // Platform won — unfreeze funds for worker
    await supabase
      .from('pending_transactions')
      .update({
        status: 'available',
        notes: `Unfrozen — dispute ${dispute.id} won by platform`
      })
      .eq('task_id', task.id)
      .eq('status', 'frozen');

    await supabase
      .from('payouts')
      .update({ status: 'available' })
      .eq('task_id', task.id)
      .eq('status', 'frozen');

    await supabase
      .from('tasks')
      .update({ escrow_status: 'released', updated_at: new Date().toISOString() })
      .eq('id', task.id);

  } else {
    // Platform lost — agent gets refund (Stripe handles this automatically on dispute loss)
    await supabase
      .from('pending_transactions')
      .update({
        status: 'cancelled',
        notes: `Cancelled — dispute ${dispute.id} lost by platform`
      })
      .eq('task_id', task.id)
      .eq('status', 'frozen');

    await supabase
      .from('payouts')
      .update({ status: 'cancelled' })
      .eq('task_id', task.id)
      .eq('status', 'frozen');

    await supabase
      .from('tasks')
      .update({ escrow_status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', task.id);
  }
}

/**
 * Handle charge.refunded — update task status
 */
async function handleChargeRefunded(charge, supabase) {
  // Try charge metadata first, then fall back to looking up by payment_intent
  let taskId = charge.metadata?.task_id;

  if (!taskId && charge.payment_intent) {
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id;
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('stripe_payment_intent_id', piId)
      .single();
    taskId = task?.id;
  }

  if (!taskId) {
    console.warn(`[Stripe Webhook] charge.refunded — could not find task for charge ${charge.id}`);
    return;
  }

  console.log(`[Stripe Webhook] Charge refunded for task ${taskId}`);

  await supabase
    .from('tasks')
    .update({
      escrow_status: 'refunded',
      escrow_refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
}

/**
 * Handle payout.failed — worker's bank rejected the transfer
 * @param {object} payout - Stripe payout object
 * @param {string} connectedAccountId - The Connect account ID (event.account, e.g. acct_xxx)
 */
async function handlePayoutFailed(payout, connectedAccountId, supabase, createNotification) {
  console.error(`[Stripe Webhook] Payout failed: ${payout.id}, connected account: ${connectedAccountId}`);

  // Find the worker by their Stripe Connect account ID (event.account, NOT payout.destination which is the bank account ID)
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_account_id', connectedAccountId)
    .single();

  if (user && createNotification) {
    await createNotification(
      user.id,
      'payout_failed',
      'Bank Deposit Failed',
      'Your bank rejected the deposit. Please check your bank account details in your Stripe dashboard and try withdrawing again.',
      '/payments'
    );
  }
}

/**
 * Handle payout.paid — worker's bank deposit has landed.
 * @param {object} payout - Stripe payout object
 * @param {string} connectedAccountId - The Connect account ID (event.account, e.g. acct_xxx)
 */
async function handlePayoutPaid(payout, connectedAccountId, supabase, createNotification) {
  if (!connectedAccountId) return;

  const amountDollars = (payout.amount / 100).toFixed(2);

  // Find worker by their Stripe Connect account ID (event.account, NOT payout.destination which is the bank account ID)
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_account_id', connectedAccountId)
    .single();

  if (user && createNotification) {
    await createNotification(
      user.id,
      'payout_paid',
      'Bank Deposit Received',
      `$${amountDollars} has been deposited to your bank account.`,
      '/payments'
    );
  }
}

module.exports = {
  getOrCreateStripeCustomer,
  createSetupIntent,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  chargeAgentForTask,
  authorizeEscrow,
  captureEscrow,
  cancelEscrowHold,
  verifyAgentHasPaymentMethod,
  createConnectAccount,
  createAccountLink,
  createLoginLink,
  getConnectAccountStatus,
  transferToWorker,
  refundPayment,
  refundPaymentIntent,
  handleWebhookEvent,
};
