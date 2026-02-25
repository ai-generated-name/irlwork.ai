/**
 * Subscription Routes - Plan management, checkout, and billing portal.
 *
 * Follows the same dependency-injection pattern as stripe.js.
 */

const express = require('express');
const { TIERS, getTierConfig } = require('../config/tiers');
const {
  createCheckoutSession,
  createBillingPortalSession,
  getUserSubscription,
  syncSubscriptionFromStripe,
} = require('../backend/services/subscriptionService');

function initSubscriptionRoutes(supabase, getUserByToken, createNotification) {
  const router = express.Router();

  // Auth middleware
  const requireAuth = async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      req.user = await getUserByToken(token);
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      next();
    } catch (error) {
      console.error('[Subscription Routes] Auth error:', error.message);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // ============================================================================
  // GET /api/subscription/tiers - Public tier info
  // ============================================================================
  router.get('/tiers', (req, res) => {
    const tiers = Object.entries(TIERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      price_monthly: config.price_monthly,
      price_annual: config.price_annual || null,
      worker_fee_percent: config.worker_fee_percent,
      poster_fee_percent: config.poster_fee_percent,
      task_limit_monthly: config.task_limit_monthly === Infinity ? 'unlimited' : config.task_limit_monthly,
      badge: config.badge,
      badge_color: config.badge_color,
      worker_priority: config.worker_priority,
    }));
    res.json({ tiers });
  });

  // All routes below require auth
  router.use(requireAuth);

  // ============================================================================
  // GET /api/subscription - Current user's subscription
  // ============================================================================
  router.get('/', async (req, res) => {
    try {
      const subscription = await getUserSubscription(supabase, req.user.id);

      // Freshness check: if user has a stripe_customer_id and their tier
      // seems stale (still free but they may have just checked out), sync.
      if (
        req.user.stripe_customer_id &&
        subscription.tier === 'free' &&
        req.query.check_stripe === 'true'
      ) {
        const synced = await syncSubscriptionFromStripe(supabase, req.user.id);
        if (synced) return res.json({ subscription: synced });
      }

      res.json({ subscription });
    } catch (error) {
      console.error('[Subscription] Get error:', error.message);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  });

  // ============================================================================
  // POST /api/subscription/checkout - Create Stripe Checkout Session
  // ============================================================================
  router.post('/checkout', async (req, res) => {
    try {
      const { tier, billing_period } = req.body;
      if (!tier || !['builder', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier. Must be "builder" or "pro".' });
      }
      if (billing_period && !['monthly', 'annual'].includes(billing_period)) {
        return res.status(400).json({ error: 'Invalid billing period. Must be "monthly" or "annual".' });
      }

      // Don't allow checkout if already on this tier
      if (req.user.subscription_tier === tier) {
        return res.status(400).json({ error: `You are already on the ${getTierConfig(tier).name} plan.` });
      }

      const result = await createCheckoutSession(supabase, req.user, tier, billing_period || 'monthly');
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Checkout error:', error.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // ============================================================================
  // POST /api/subscription/portal - Open Stripe Billing Portal
  // ============================================================================
  router.post('/portal', async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing account found. Please subscribe to a plan first.' });
      }

      const result = await createBillingPortalSession(req.user.stripe_customer_id);
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Portal error:', error.message);
      res.status(500).json({ error: 'Failed to create billing portal session' });
    }
  });

  // ============================================================================
  // POST /api/subscription/sync - Manual subscription restore
  // ============================================================================
  router.post('/sync', async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing account found.' });
      }

      const subscription = await syncSubscriptionFromStripe(supabase, req.user.id);
      res.json({ subscription, synced: true });
    } catch (error) {
      console.error('[Subscription] Sync error:', error.message);
      res.status(500).json({ error: 'Failed to sync subscription' });
    }
  });

  return router;
}

module.exports = initSubscriptionRoutes;
