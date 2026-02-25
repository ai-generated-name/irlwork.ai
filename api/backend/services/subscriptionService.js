const { stripe } = require('../lib/stripe');
const { getTierConfig, TIERS } = require('../../config/tiers');

const TIER_PRICE_MAP = {
  builder: {
    monthly: process.env.STRIPE_PRICE_BUILDER,
    annual: process.env.STRIPE_PRICE_BUILDER_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

/**
 * Look up the tier name from a Stripe price ID.
 */
function tierFromPriceId(priceId) {
  for (const [tier, prices] of Object.entries(TIER_PRICE_MAP)) {
    if (prices.monthly === priceId || prices.annual === priceId) return tier;
  }
  return null;
}

/**
 * Look up the billing period from a Stripe price ID.
 */
function billingPeriodFromPriceId(priceId) {
  for (const [tier, prices] of Object.entries(TIER_PRICE_MAP)) {
    if (prices.annual === priceId) return 'annual';
    if (prices.monthly === priceId) return 'monthly';
  }
  return 'monthly';
}

/**
 * Look up a user by their stripe_customer_id.
 */
async function getUserByStripeCustomer(supabase, stripeCustomerId) {
  const { data } = await supabase
    .from('users')
    .select('id, email, name, subscription_tier, stripe_customer_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data;
}

// ============================================================================
// CHECKOUT & PORTAL
// ============================================================================

/**
 * Create a Stripe Checkout Session for a subscription upgrade.
 */
async function createCheckoutSession(supabase, user, tier, billingPeriod = 'monthly') {
  if (!stripe) throw new Error('Stripe not configured');
  const prices = TIER_PRICE_MAP[tier];
  if (!prices) throw new Error(`No Stripe price configured for tier: ${tier}`);

  const priceId = billingPeriod === 'annual' ? prices.annual : prices.monthly;
  if (!priceId) throw new Error(`No Stripe price configured for tier: ${tier}, period: ${billingPeriod}`);

  // Ensure user has a Stripe customer
  const { getOrCreateStripeCustomer } = require('./stripeService');
  const customerId = await getOrCreateStripeCustomer(supabase, user);

  const baseUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/premium?subscription=success`,
    cancel_url: `${baseUrl}/premium?subscription=canceled`,
    metadata: { user_id: user.id, tier, billing_period: billingPeriod },
    subscription_data: { metadata: { user_id: user.id, tier, billing_period: billingPeriod } },
  });

  return { checkout_url: session.url, session_id: session.id };
}

/**
 * Create a Stripe Billing Portal session for subscription management.
 */
async function createBillingPortalSession(stripeCustomerId) {
  if (!stripe) throw new Error('Stripe not configured');

  const baseUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/premium`,
  });

  return { portal_url: session.url };
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle checkout.session.completed — belt-and-suspenders tier upgrade.
 */
async function handleCheckoutCompleted(session, supabase) {
  if (session.mode !== 'subscription') return;

  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const billingPeriod = session.metadata?.billing_period || 'monthly';
  if (!userId || !tier) return;

  console.log(`[Subscription] Checkout completed for user ${userId}, tier ${tier}, period ${billingPeriod}`);
  await upsertSubscription(supabase, userId, {
    tier,
    billing_period: billingPeriod,
    stripe_subscription_id: session.subscription,
    status: 'active',
  });
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription, supabase, createNotification) {
  const user = await getUserByStripeCustomer(supabase, subscription.customer);
  if (!user) {
    console.warn(`[Subscription] No user found for customer ${subscription.customer}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = subscription.metadata?.tier || tierFromPriceId(priceId);
  if (!tier) {
    console.warn(`[Subscription] Could not determine tier for subscription ${subscription.id}`);
    return;
  }

  const billingPeriod = subscription.metadata?.billing_period || billingPeriodFromPriceId(priceId);

  console.log(`[Subscription] Created for user ${user.id}, tier ${tier}, period ${billingPeriod}`);
  await upsertSubscription(supabase, user.id, {
    tier,
    billing_period: billingPeriod,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  });

  if (createNotification) {
    const tierConfig = getTierConfig(tier);
    try {
      await createNotification(user.id, 'subscription_activated',
        `Welcome to ${tierConfig.name}!`,
        `Your ${tierConfig.name} membership is now active. Enjoy your new benefits!`,
        '/premium'
      );
    } catch (e) {
      console.error('[Subscription] Failed to create notification:', e.message);
    }
  }
}

/**
 * Handle customer.subscription.updated — plan changes, cancel_at_period_end, status transitions.
 */
async function handleSubscriptionUpdated(subscription, supabase) {
  const user = await getUserByStripeCustomer(supabase, subscription.customer);
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = subscription.metadata?.tier || tierFromPriceId(priceId);
  const billingPeriod = subscription.metadata?.billing_period || billingPeriodFromPriceId(priceId);

  const updates = {
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    billing_period: billingPeriod,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
  };

  if (tier) updates.tier = tier;

  console.log(`[Subscription] Updated for user ${user.id}, status=${subscription.status}, cancel_at_period_end=${subscription.cancel_at_period_end}, period=${billingPeriod}`);

  // If subscription is still active (even if cancel_at_period_end), keep the paid tier
  if (subscription.status === 'active' && tier) {
    await upsertSubscription(supabase, user.id, updates);
  } else if (subscription.status === 'past_due') {
    // Keep current tier but flag status
    updates.tier = updates.tier || user.subscription_tier;
    await upsertSubscription(supabase, user.id, updates);
  } else {
    await upsertSubscription(supabase, user.id, updates);
  }
}

/**
 * Handle customer.subscription.deleted — fires at period end after cancellation.
 * Reverts user to free tier.
 */
async function handleSubscriptionDeleted(subscription, supabase) {
  const user = await getUserByStripeCustomer(supabase, subscription.customer);
  if (!user) return;

  console.log(`[Subscription] Deleted for user ${user.id}, reverting to free`);

  await supabase
    .from('subscriptions')
    .update({
      tier: 'free',
      billing_period: null,
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
}

/**
 * Handle invoice.paid — record in billing history.
 */
async function handleInvoicePaid(invoice, supabase) {
  if (!invoice.subscription) return; // Only track subscription invoices

  const user = await getUserByStripeCustomer(supabase, invoice.customer);
  if (!user) return;

  await recordInvoice(supabase, user.id, invoice);
}

/**
 * Handle invoice.payment_failed — mark subscription as past_due.
 */
async function handleInvoicePaymentFailed(invoice, supabase, createNotification) {
  if (!invoice.subscription) return;

  const user = await getUserByStripeCustomer(supabase, invoice.customer);
  if (!user) return;

  console.log(`[Subscription] Invoice payment failed for user ${user.id}`);

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  await recordInvoice(supabase, user.id, invoice);

  if (createNotification) {
    try {
      await createNotification(user.id, 'payment_failed',
        'Subscription Payment Failed',
        'Your subscription payment failed. Please update your payment method to keep your plan.',
        '/premium'
      );
    } catch (e) {
      console.error('[Subscription] Failed to create notification:', e.message);
    }
  }
}

// ============================================================================
// BILLING HISTORY
// ============================================================================

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

  const { error } = await supabase
    .from('billing_history')
    .upsert(record, { onConflict: 'stripe_invoice_id' });

  if (error) {
    console.error('[Subscription] Error recording invoice:', error.message);
  }
}

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
// SUBSCRIPTION QUERIES
// ============================================================================

/**
 * Get a user's current subscription, or synthesize a free-tier object.
 */
async function getUserSubscription(supabase, userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (data) return data;

  // Synthesize free tier
  return {
    user_id: userId,
    tier: 'free',
    status: 'active',
    billing_period: null,
    stripe_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
  };
}

/**
 * Fallback sync: fetch subscriptions directly from Stripe and reconcile with DB.
 * Used when webhooks may have failed.
 */
async function syncSubscriptionFromStripe(supabase, userId) {
  if (!stripe) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, stripe_customer_id, subscription_tier')
    .eq('id', userId)
    .single();

  if (!user?.stripe_customer_id) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripe_customer_id,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0]?.price?.id;
    const tier = sub.metadata?.tier || tierFromPriceId(priceId);
    const billingPeriod = sub.metadata?.billing_period || billingPeriodFromPriceId(priceId);

    if (tier && tier !== user.subscription_tier) {
      console.log(`[Subscription Sync] Reconciling user ${userId}: ${user.subscription_tier} → ${tier}`);
      await upsertSubscription(supabase, userId, {
        tier,
        billing_period: billingPeriod,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end || false,
      });
    }

    return await getUserSubscription(supabase, userId);
  }

  // No active subscription — ensure user is on free
  if (user.subscription_tier !== 'free') {
    console.log(`[Subscription Sync] No active Stripe sub for user ${userId}, reverting to free`);
    await supabase.from('users').update({ subscription_tier: 'free', updated_at: new Date().toISOString() }).eq('id', userId);
    await supabase.from('subscriptions').update({ tier: 'free', status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', userId);
  }

  return await getUserSubscription(supabase, userId);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Upsert a subscription record and update the denormalized users.subscription_tier.
 */
async function upsertSubscription(supabase, userId, fields) {
  const now = new Date().toISOString();

  // Upsert subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      ...fields,
      updated_at: now,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error(`[Subscription] Failed to upsert for user ${userId}:`, error.message);
    throw error;
  }

  // Update denormalized tier on users table
  if (fields.tier) {
    await supabase
      .from('users')
      .update({ subscription_tier: fields.tier, updated_at: now })
      .eq('id', userId);
  }
}

module.exports = {
  createCheckoutSession,
  createBillingPortalSession,
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  getUserSubscription,
  syncSubscriptionFromStripe,
  getBillingHistory,
  TIER_PRICE_MAP,
};
