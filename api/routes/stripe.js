/**
 * Stripe Routes - Payment method management + Connect onboarding
 *
 * Follows the same dependency-injection pattern as admin.js.
 * All routes require authentication except publishable-key.
 */

const express = require('express');
const {
  getOrCreateStripeCustomer,
  createSetupIntent,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  createConnectAccount,
  createAccountLink,
  createLoginLink,
  getConnectAccountStatus,
} = require('../backend/services/stripeService');

function initStripeRoutes(supabase, getUserByToken, createNotification) {
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
      console.error('[Stripe Routes] Auth error:', error.message);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // ============================================================================
  // GET /api/stripe/publishable-key - Public endpoint for frontend
  // ============================================================================
  router.get('/publishable-key', (req, res) => {
    res.json({ publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null });
  });

  // All routes below require auth
  router.use(requireAuth);

  // ============================================================================
  // POST /api/stripe/setup-intent - Agent saves a card
  // ============================================================================
  router.post('/setup-intent', async (req, res) => {
    try {
      const customerId = await getOrCreateStripeCustomer(supabase, req.user);
      const { client_secret, setup_intent_id } = await createSetupIntent(customerId);

      res.json({ client_secret, setup_intent_id });
    } catch (error) {
      console.error('[Stripe] Setup intent error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/stripe/payment-methods - List agent's saved cards
  // ============================================================================
  router.get('/payment-methods', async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.json({ payment_methods: [] });
      }

      const methods = await listPaymentMethods(req.user.stripe_customer_id);
      res.json({ payment_methods: methods });
    } catch (error) {
      console.error('[Stripe] List payment methods error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DELETE /api/stripe/payment-methods/:id - Remove a card
  // ============================================================================
  router.delete('/payment-methods/:id', async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.status(400).json({ error: 'No Stripe customer found' });
      }

      // Verify the payment method belongs to this customer
      const methods = await listPaymentMethods(req.user.stripe_customer_id);
      const belongs = methods.some(m => m.id === req.params.id);
      if (!belongs) {
        return res.status(403).json({ error: 'Payment method does not belong to you' });
      }

      await deletePaymentMethod(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Stripe] Delete payment method error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/stripe/payment-methods/:id/default - Set as default
  // ============================================================================
  router.post('/payment-methods/:id/default', async (req, res) => {
    try {
      if (!req.user.stripe_customer_id) {
        return res.status(400).json({ error: 'No Stripe customer found' });
      }

      // Verify ownership
      const methods = await listPaymentMethods(req.user.stripe_customer_id);
      const belongs = methods.some(m => m.id === req.params.id);
      if (!belongs) {
        return res.status(403).json({ error: 'Payment method does not belong to you' });
      }

      await setDefaultPaymentMethod(req.user.stripe_customer_id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Stripe] Set default PM error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/stripe/connect/onboard - Worker starts Stripe Connect
  // ============================================================================
  router.post('/connect/onboard', async (req, res) => {
    try {
      // If worker already has account but onboarding incomplete, create new link
      if (req.user.stripe_account_id && !req.user.stripe_onboarding_complete) {
        const onboardingUrl = await createAccountLink(req.user.stripe_account_id);
        return res.json({
          account_id: req.user.stripe_account_id,
          onboarding_url: onboardingUrl
        });
      }

      // If already fully onboarded
      if (req.user.stripe_account_id && req.user.stripe_onboarding_complete) {
        return res.json({
          account_id: req.user.stripe_account_id,
          already_connected: true,
          message: 'Bank account already connected'
        });
      }

      // Create new Connect account
      const result = await createConnectAccount(supabase, req.user);
      res.json(result);
    } catch (error) {
      console.error('[Stripe] Connect onboard error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/stripe/connect/dashboard - Get Stripe Express Dashboard link
  // Workers can manage bank accounts, view payouts, update tax info here
  // ============================================================================
  router.get('/connect/dashboard', async (req, res) => {
    try {
      if (!req.user.stripe_account_id) {
        return res.status(400).json({ error: 'No Stripe Connect account found. Set up your bank first.' });
      }

      if (!req.user.stripe_onboarding_complete) {
        return res.status(400).json({ error: 'Please complete your bank setup first.' });
      }

      const dashboardUrl = await createLoginLink(req.user.stripe_account_id);
      res.json({ dashboard_url: dashboardUrl });
    } catch (error) {
      console.error('[Stripe] Dashboard link error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/stripe/connect/update-bank - Re-onboard to change bank account
  // Creates a new onboarding link so the worker can update their bank details
  // ============================================================================
  router.post('/connect/update-bank', async (req, res) => {
    try {
      if (!req.user.stripe_account_id) {
        return res.status(400).json({ error: 'No Stripe Connect account found. Set up your bank first.' });
      }

      const onboardingUrl = await createAccountLink(req.user.stripe_account_id);
      res.json({ onboarding_url: onboardingUrl });
    } catch (error) {
      console.error('[Stripe] Update bank error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/stripe/connect/status - Check worker's Connect status
  // ============================================================================
  router.get('/connect/status', async (req, res) => {
    try {
      if (!req.user.stripe_account_id) {
        return res.json({ connected: false, payouts_enabled: false, details_submitted: false });
      }

      const status = await getConnectAccountStatus(req.user.stripe_account_id);

      res.json({
        connected: true,
        stripe_account_id: req.user.stripe_account_id,
        ...status
      });
    } catch (error) {
      console.error('[Stripe] Connect status error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = initStripeRoutes;
