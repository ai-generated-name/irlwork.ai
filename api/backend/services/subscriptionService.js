/**
 * Subscription Service - Manages premium membership tiers via Stripe
 *
 * Handles checkout session creation, subscription lifecycle,
 * billing history, and tier management.
 */

const { stripe } = require('../lib/stripe');
const { getOrCreateStripeCustomer } = require('./stripeService');
const { SUBSCRIPTION_TIERS } = require('../../config/constants');

// ============================================================================
// STRIPE PRICE LOOKUP
// ============================================================================

/**
 * Retrieve or create Stripe Price objects for a given tier + interval.
 * Uses metadata lookup to find existing prices, creates them if missing.
 *
 * In production, you'd create Products/Prices once in the Stripe Dashboard
 * and store the IDs in env vars. This auto-creates them for convenience.
 */
async function getOrCreateStripePrice(tier, interval) {
  if (!stripe) throw new Error('Stripe not configured');
  if (!SUBSCRIPTION_TIERS[tier]) throw new Error(`Invalid tier: ${tier}`);
  if (tier === 'free') throw new Error('Free tier has no price');

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const amountCents = interval === 'year' ? tierConfig.yearlyPriceCents : tierConfig.monthlyPriceCents;

  // Check env vars first (preferred: pre-created prices)
  const envKey = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // Search for existing price by metadata
  const existingPrices = await stripe.prices.search({
    query: `metadata["platform"]:"irlwork" AND metadata["tier"]:"${tier}" AND metadata["interval"]:"${interval}" AND active:"true"`,
  });

  if (existingPrices.data.length > 0) {
    return existingPrices.data[0].id;
  }

  // Create product + price
  let product;
  const existingProducts = await stripe.products.search({
    query: `metadata["platform"]:"irlwork" AND metadata["tier"]:"${tier}" AND active:"true"`,
  });

  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0];
  } else {
    product = await stripe.products.create({
      name: `irlwork ${tierConfig.name} Plan`,
      description: `irlwork.ai ${tierConfig.name} membership`,
      metadata: { platform: 'irlwork', tier },
    });
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amountCents,
    currency: 'usd',
    recurring: { interval },
    metadata: { platform: 'irlwork', tier, interval },
  });

  return price.id;
}

// ============================================================================
// CHECKOUT SESSION
// ============================================================================

/**
 * Create a Stripe Checkout Session for upgrading to a subscription.
 * Returns a URL to redirect the user to.
 */
async function createSubscriptionCheckout(supabase, user, tier, interval = 'month') {
  if (!stripe) throw new Error('Stripe not configured');
  if (!SUBSCRIPTION_TIERS[tier] || tier === 'free') {
    throw new Error('Invalid subscription tier');
  }

  // Ensure customer exists
  const customerId = await getOrCreateStripeCustomer(supabase, user);

  // Check if user already has an active subscription
  if (user.stripe_subscription_id) {
    const existingSub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    if (existingSub.status === 'active' || existingSub.status === 'trialing') {
      throw new Error('You already have an active subscription. Please manage it from your settings.');
    }
  }

  const priceId = await getOrCreateStripePrice(tier, interval);
  const baseUrl = process.env.FRONTEND_URL || 'https://www.irlwork.ai';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}?tab=settings&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}?tab=settings&subscription=cancelled`,
    subscription_data: {
      metadata: {
        user_id: user.id,
        tier,
        platform: 'irlwork',
      },
    },
    metadata: {
      user_id: user.id,
      tier,
      platform: 'irlwork',
    },
    allow_promotion_codes: true,
  });

  return { checkout_url: session.url, session_id: session.id };
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get the user's current subscription details from Stripe.
 */
async function getSubscriptionDetails(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  if (!user.stripe_subscription_id) {
    return {
      tier: user.subscription_tier || 'free',
      status: 'inactive',
      current_period_end: null,
      cancel_at_period_end: false,
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
      expand: ['default_payment_method', 'latest_invoice'],
    });

    return {
      tier: user.subscription_tier || 'free',
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method: subscription.default_payment_method ? {
        brand: subscription.default_payment_method.card?.brand,
        last4: subscription.default_payment_method.card?.last4,
      } : null,
      latest_invoice: subscription.latest_invoice ? {
        amount_paid: subscription.latest_invoice.amount_paid,
        status: subscription.latest_invoice.status,
        invoice_url: subscription.latest_invoice.hosted_invoice_url,
      } : null,
    };
  } catch (error) {
    console.error('[Subscription] Error fetching details:', error.message);
    return {
      tier: user.subscription_tier || 'free',
      status: 'inactive',
      current_period_end: null,
      cancel_at_period_end: false,
    };
  }
}

/**
 * Change subscription tier (upgrade/downgrade).
 * Creates a new checkout session for upgrades, or modifies the existing subscription.
 */
async function changeSubscriptionTier(supabase, user, newTier, interval = 'month') {
  if (!stripe) throw new Error('Stripe not configured');
  if (!SUBSCRIPTION_TIERS[newTier]) throw new Error('Invalid tier');

  // Downgrading to free = cancel subscription
  if (newTier === 'free') {
    return cancelSubscription(supabase, user);
  }

  // No existing subscription — create checkout
  if (!user.stripe_subscription_id) {
    return createSubscriptionCheckout(supabase, user, newTier, interval);
  }

  // Modify existing subscription
  const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    // Subscription is not active — create new checkout
    return createSubscriptionCheckout(supabase, user, newTier, interval);
  }

  const priceId = await getOrCreateStripePrice(newTier, interval);

  // Update the subscription with the new price (prorated)
  const updated = await stripe.subscriptions.update(user.stripe_subscription_id, {
    items: [{
      id: subscription.items.data[0].id,
      price: priceId,
    }],
    proration_behavior: 'create_prorations',
    metadata: {
      user_id: user.id,
      tier: newTier,
      platform: 'irlwork',
    },
  });

  // Update local DB
  await supabase
    .from('users')
    .update({
      subscription_tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  return {
    status: 'updated',
    tier: newTier,
    current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
  };
}

/**
 * Cancel subscription at period end (user keeps benefits until billing cycle ends).
 */
async function cancelSubscription(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  if (!user.stripe_subscription_id) {
    throw new Error('No active subscription to cancel');
  }

  const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  await supabase
    .from('users')
    .update({
      subscription_cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  return {
    status: 'cancelling',
    cancel_at_period_end: true,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };
}

/**
 * Resume a subscription that was set to cancel at period end.
 */
async function resumeSubscription(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  if (!user.stripe_subscription_id) {
    throw new Error('No subscription to resume');
  }

  await stripe.subscriptions.update(user.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await supabase
    .from('users')
    .update({
      subscription_cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  return { status: 'active', cancel_at_period_end: false };
}

// ============================================================================
// BILLING PORTAL
// ============================================================================

/**
 * Create a Stripe Customer Portal session for managing billing.
 * Lets users update payment methods, view invoices, cancel, etc.
 */
async function createBillingPortalSession(supabase, user) {
  if (!stripe) throw new Error('Stripe not configured');

  const customerId = await getOrCreateStripeCustomer(supabase, user);
  const baseUrl = process.env.FRONTEND_URL || 'https://www.irlwork.ai';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}?tab=settings`,
  });

  return { portal_url: session.url };
}

// ============================================================================
// BILLING HISTORY
// ============================================================================

/**
 * Get billing history from local DB (synced via webhooks).
 */
async function getBillingHistory(supabase, userId, limit = 20, offset = 0) {
  const { data, error, count } = await supabase
    .from('billing_history')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Subscription] Error fetching billing history:', error.message);
    throw new Error('Failed to fetch billing history');
  }

  return { invoices: data || [], total: count || 0 };
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle customer.subscription.created — initial subscription activation
 */
async function handleSubscriptionCreated(subscription, supabase, createNotification) {
  const userId = subscription.metadata?.user_id;
  const tier = subscription.metadata?.tier;

  if (!userId || !tier) {
    console.warn('[Subscription Webhook] Missing user_id or tier in metadata');
    return;
  }

  console.log(`[Subscription Webhook] Subscription created for user ${userId}, tier: ${tier}`);

  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (createNotification) {
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    await createNotification(
      userId,
      'subscription_activated',
      'Welcome to ' + (tierConfig?.name || tier) + '!',
      `Your ${tierConfig?.name || tier} membership is now active. Enjoy your new benefits!`,
      '/?tab=settings'
    );
  }
}

/**
 * Handle customer.subscription.updated — plan changes, renewals, cancellations
 */
async function handleSubscriptionUpdated(subscription, supabase, createNotification) {
  const userId = subscription.metadata?.user_id;
  const tier = subscription.metadata?.tier;

  if (!userId) {
    // Try to find user by stripe_subscription_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!user) {
      console.warn('[Subscription Webhook] Could not find user for subscription:', subscription.id);
      return;
    }

    await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_tier: tier || undefined,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        subscription_cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return;
  }

  const updateData = {
    subscription_status: subscription.status,
    subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (tier) {
    updateData.subscription_tier = tier;
  }

  await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);
}

/**
 * Handle customer.subscription.deleted — subscription ended
 */
async function handleSubscriptionDeleted(subscription, supabase, createNotification) {
  let userId = subscription.metadata?.user_id;

  if (!userId) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    userId = user?.id;
  }

  if (!userId) {
    console.warn('[Subscription Webhook] Could not find user for deleted subscription:', subscription.id);
    return;
  }

  console.log(`[Subscription Webhook] Subscription deleted for user ${userId}`);

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'inactive',
      stripe_subscription_id: null,
      subscription_current_period_start: null,
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (createNotification) {
    await createNotification(
      userId,
      'subscription_cancelled',
      'Subscription Ended',
      'Your premium membership has ended. You\'re now on the Free plan.',
      '/?tab=settings'
    );
  }
}

/**
 * Handle invoice.paid — record in billing history
 */
async function handleInvoicePaid(invoice, supabase) {
  if (!invoice.subscription) return; // Only track subscription invoices

  const userId = invoice.subscription_details?.metadata?.user_id
    || invoice.metadata?.user_id;

  if (!userId) {
    // Look up by customer
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', invoice.customer)
      .single();

    if (!user) return;

    await recordInvoice(supabase, user.id, invoice);
    return;
  }

  await recordInvoice(supabase, userId, invoice);
}

/**
 * Handle invoice.payment_failed — notify user
 */
async function handleInvoicePaymentFailed(invoice, supabase, createNotification) {
  if (!invoice.subscription) return;

  let userId = invoice.subscription_details?.metadata?.user_id
    || invoice.metadata?.user_id;

  if (!userId) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', invoice.customer)
      .single();
    userId = user?.id;
  }

  if (!userId) return;

  await recordInvoice(supabase, userId, invoice);

  if (createNotification) {
    await createNotification(
      userId,
      'payment_failed',
      'Subscription Payment Failed',
      'We were unable to process your subscription payment. Please update your payment method to avoid service interruption.',
      '/?tab=settings'
    );
  }
}

/**
 * Record an invoice in billing_history (upsert by stripe_invoice_id).
 */
async function recordInvoice(supabase, userId, invoice) {
  const record = {
    user_id: userId,
    stripe_invoice_id: invoice.id,
    stripe_charge_id: invoice.charge || null,
    amount_cents: invoice.amount_paid || invoice.amount_due || 0,
    currency: invoice.currency || 'usd',
    status: invoice.status || 'unknown',
    description: invoice.lines?.data?.[0]?.description || 'Subscription payment',
    invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
  };

  // Upsert: update if stripe_invoice_id already exists
  const { error } = await supabase
    .from('billing_history')
    .upsert(record, { onConflict: 'stripe_invoice_id' });

  if (error) {
    console.error('[Subscription] Error recording invoice:', error.message);
  }
}

// ============================================================================
// AVAILABLE PLANS (public)
// ============================================================================

/**
 * Get all available subscription plans (for pricing display).
 */
function getAvailablePlans() {
  return Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    monthlyPrice: tier.monthlyPriceCents,
    yearlyPrice: tier.yearlyPriceCents,
    platformFee: tier.platformFeePercent,
    features: tier.features,
  }));
}

module.exports = {
  createSubscriptionCheckout,
  getSubscriptionDetails,
  changeSubscriptionTier,
  cancelSubscription,
  resumeSubscription,
  createBillingPortalSession,
  getBillingHistory,
  getAvailablePlans,
  // Webhook handlers
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
};
