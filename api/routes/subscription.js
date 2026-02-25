/**
 * Subscription Routes - Premium membership management
 *
 * Follows the same dependency-injection pattern as stripe.js.
 * All routes require authentication except /plans.
 */

const express = require('express');
const {
  createSubscriptionCheckout,
  getSubscriptionDetails,
  changeSubscriptionTier,
  cancelSubscription,
  resumeSubscription,
  createBillingPortalSession,
  getBillingHistory,
  getAvailablePlans,
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
  // GET /api/subscription/plans - Public endpoint for pricing display
  // ============================================================================
  router.get('/plans', (req, res) => {
    res.json({ plans: getAvailablePlans() });
  });

  // All routes below require auth
  router.use(requireAuth);

  // ============================================================================
  // GET /api/subscription - Get current subscription details
  // ============================================================================
  router.get('/', async (req, res) => {
    try {
      const details = await getSubscriptionDetails(supabase, req.user);
      res.json(details);
    } catch (error) {
      console.error('[Subscription] Get details error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/subscription/checkout - Create checkout session for upgrade
  // ============================================================================
  router.post('/checkout', async (req, res) => {
    try {
      const { tier, interval } = req.body;

      if (!tier) {
        return res.status(400).json({ error: 'Tier is required' });
      }

      const result = await createSubscriptionCheckout(
        supabase, req.user, tier, interval || 'month'
      );
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Checkout error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/subscription/change - Upgrade or downgrade plan
  // ============================================================================
  router.post('/change', async (req, res) => {
    try {
      const { tier, interval } = req.body;

      if (!tier) {
        return res.status(400).json({ error: 'Tier is required' });
      }

      const result = await changeSubscriptionTier(
        supabase, req.user, tier, interval || 'month'
      );
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Change tier error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/subscription/cancel - Cancel subscription at period end
  // ============================================================================
  router.post('/cancel', async (req, res) => {
    try {
      const result = await cancelSubscription(supabase, req.user);
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Cancel error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/subscription/resume - Resume a cancelled subscription
  // ============================================================================
  router.post('/resume', async (req, res) => {
    try {
      const result = await resumeSubscription(supabase, req.user);
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Resume error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/subscription/portal - Create Stripe billing portal session
  // ============================================================================
  router.post('/portal', async (req, res) => {
    try {
      const result = await createBillingPortalSession(supabase, req.user);
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Portal error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/subscription/billing - Get billing history
  // ============================================================================
  router.get('/billing', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const result = await getBillingHistory(supabase, req.user.id, limit, offset);
      res.json(result);
    } catch (error) {
      console.error('[Subscription] Billing history error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = initSubscriptionRoutes;
