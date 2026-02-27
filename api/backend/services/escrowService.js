/**
 * Escrow Service
 *
 * Thin orchestration layer combining stripeService calls with
 * DB state updates for the accept/start/cancel lifecycle.
 *
 * This service wraps the low-level Stripe operations (authorizeEscrow,
 * captureEscrow, cancelEscrowHold) with the corresponding task status
 * and escrow status DB updates.
 *
 * NOTE: This service is currently a reference implementation.
 * The actual escrow orchestration is still inline in server.js endpoints.
 * During full ARCH-1 extraction, server.js should import from here.
 *
 * Usage:
 *   const { ESCROW_STATUSES } = require('./services/escrowService');
 */

/**
 * Escrow status values and their meanings:
 *
 * - null: No escrow initiated (USDC/legacy tasks)
 * - 'authorized': Auth hold placed, not yet captured (assigned status)
 * - 'deposited': Captured — funds held by platform (in_progress+)
 * - 'released': Released to worker's pending balance (approved/paid)
 * - 'refunded': Refunded to agent (cancelled/dispute resolved)
 */
const ESCROW_STATUSES = {
  AUTHORIZED: 'authorized',
  DEPOSITED: 'deposited',
  RELEASED: 'released',
  REFUNDED: 'refunded'
};

/**
 * Auth hold configuration
 */
const AUTH_HOLD_CONFIG = {
  // Stripe auth holds expire after 7 days. We renew at 6.5 days for safety buffer.
  EXPIRES_DAYS: 6.5,
  // Renewal check interval (every 6 hours)
  RENEWAL_INTERVAL_MS: 6 * 60 * 60 * 1000,
  // Grace period after expiry notification before auto-cancel
  GRACE_PERIOD_MS: 24 * 60 * 60 * 1000
};

module.exports = {
  ESCROW_STATUSES,
  AUTH_HOLD_CONFIG
};
