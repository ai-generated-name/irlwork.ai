// Stripe Client Singleton
// Mirrors the pattern in supabase.js — single shared instance
const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 })
  : null;

if (!stripe) {
  console.warn('⚠️ Stripe not configured. Set STRIPE_SECRET_KEY to enable Stripe payments.');
}

module.exports = { stripe };
