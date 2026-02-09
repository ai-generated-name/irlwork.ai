const { stripe } = require('../lib/stripe');
const { v4: uuidv4 } = require('uuid');

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

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
// WEBHOOK HANDLING
// ============================================================================

/**
 * Process a Stripe webhook event with idempotency.
 */
async function handleWebhookEvent(event, supabase, createNotification) {
  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single();

  if (existing) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
    return;
  }

  // Record the event before processing
  await supabase.from('stripe_events').insert({
    id: event.id,
    type: event.type,
    processed_at: new Date().toISOString()
  });

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

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
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

  console.error(`[Stripe Webhook] Transfer failed: ${transfer.id}`);

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
      'Your bank payout could not be completed. Please verify your bank account details and try again.',
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
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  transferToWorker,
  handleWebhookEvent,
  PLATFORM_FEE_PERCENT,
};
