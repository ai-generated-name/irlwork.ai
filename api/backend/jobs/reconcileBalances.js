/**
 * USDC Balance Reconciliation Job
 *
 * Compares the DB-tracked USDC balances (usdc_available_balance, usdc_escrow_balance)
 * against on-chain Circle wallet balances. Logs discrepancies for manual review.
 *
 * Intended to run hourly via cron or scheduled invocation.
 *
 * Usage:
 *   node api/backend/jobs/reconcileBalances.js
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET
 */

const { createClient } = require('@supabase/supabase-js');

async function reconcileBalances() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Reconcile] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let circleService;
  try {
    circleService = require('../services/circleService');
  } catch (e) {
    console.error('[Reconcile] Circle service not configured:', e.message);
    process.exit(1);
  }

  console.log('[Reconcile] Starting USDC balance reconciliation...');

  // Get all users with Circle wallets AND a wallet address
  // Users with balance but no wallet have funds held in escrow (Fix 7 edge case)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, circle_wallet_id, circle_wallet_address, usdc_available_balance, usdc_escrow_balance')
    .not('circle_wallet_id', 'is', null)
    .not('circle_wallet_address', 'is', null);

  if (error) {
    console.error('[Reconcile] Failed to fetch users:', error.message);
    process.exit(1);
  }

  // Log walletless workers with balances (info-level — these are expected from Fix 7)
  const { data: walletlessWorkers } = await supabase
    .from('users')
    .select('id, email, usdc_available_balance')
    .is('circle_wallet_address', null)
    .gt('usdc_available_balance', 0);

  if (walletlessWorkers?.length > 0) {
    const walletlessFundsTotal = walletlessWorkers.reduce(
      (sum, u) => sum + parseFloat(u.usdc_available_balance || 0), 0
    );
    console.log(
      `[Reconcile] ${walletlessWorkers.length} worker(s) without Circle wallet hold ` +
      `${walletlessFundsTotal.toFixed(6)} USDC in DB (funds held in escrow wallet on-chain)`
    );
  }

  console.log(`[Reconcile] Checking ${users.length} users with Circle wallets`);

  let discrepancies = 0;

  for (const user of users) {
    try {
      const onChainBalance = await circleService.getWalletBalance(user.circle_wallet_id);
      const dbTotal = parseFloat(user.usdc_available_balance || '0') + parseFloat(user.usdc_escrow_balance || '0');

      // Allow small floating point tolerance (< 0.01 USDC)
      const diff = Math.abs(onChainBalance - dbTotal);
      if (diff > 0.01) {
        discrepancies++;
        console.warn(
          `[Reconcile] DISCREPANCY for user ${user.id} (${user.email}): ` +
          `on-chain=${onChainBalance.toFixed(6)}, db_total=${dbTotal.toFixed(6)} ` +
          `(available=${user.usdc_available_balance}, escrow=${user.usdc_escrow_balance}), ` +
          `diff=${diff.toFixed(6)}`
        );
      }
    } catch (e) {
      console.error(`[Reconcile] Failed to check user ${user.id}:`, e.message);
    }
  }

  // Also check escrow wallet
  const escrowWalletId = process.env.CIRCLE_ESCROW_WALLET_ID;
  if (escrowWalletId) {
    try {
      const escrowOnChain = await circleService.getWalletBalance(escrowWalletId);

      // Sum all users' escrow balances (manual sum — no dependency on sum_column RPC)
      let totalDbEscrow = 0;
      const { data: allUsersEscrow } = await supabase
        .from('users')
        .select('usdc_escrow_balance')
        .gt('usdc_escrow_balance', 0);
      for (const u of (allUsersEscrow || [])) {
        totalDbEscrow += parseFloat(u.usdc_escrow_balance || '0');
      }

      // Sum funds belonging to workers without Circle wallets
      // These are legitimately held in the escrow wallet, not a discrepancy (Fix 7)
      let walletlessFundsTotal = 0;
      const { data: walletlessFunds } = await supabase
        .from('users')
        .select('usdc_available_balance')
        .is('circle_wallet_address', null)
        .gt('usdc_available_balance', 0);
      for (const u of (walletlessFunds || [])) {
        walletlessFundsTotal += parseFloat(u.usdc_available_balance || '0');
      }

      // Expected escrow on-chain = sum of DB escrow + walletless worker funds
      const expectedEscrow = totalDbEscrow + walletlessFundsTotal;

      const diff = Math.abs(escrowOnChain - expectedEscrow);
      if (diff > 0.01) {
        discrepancies++;
        console.warn(
          `[Reconcile] ESCROW WALLET DISCREPANCY: ` +
          `on-chain=${escrowOnChain.toFixed(6)}, expected=${expectedEscrow.toFixed(6)} ` +
          `(db_escrow=${totalDbEscrow.toFixed(6)} + walletless_worker_funds=${walletlessFundsTotal.toFixed(6)}), ` +
          `diff=${diff.toFixed(6)}`
        );
      } else {
        console.log(
          `[Reconcile] Escrow wallet OK: on-chain=${escrowOnChain.toFixed(6)}, ` +
          `expected=${expectedEscrow.toFixed(6)} (escrow=${totalDbEscrow.toFixed(6)} + walletless=${walletlessFundsTotal.toFixed(6)})`
        );
      }
    } catch (e) {
      console.error('[Reconcile] Failed to check escrow wallet:', e.message);
    }
  }

  if (discrepancies === 0) {
    console.log('[Reconcile] All balances match. No discrepancies found.');
  } else {
    console.warn(`[Reconcile] Found ${discrepancies} discrepancies. Review above warnings.`);
  }

  console.log('[Reconcile] Reconciliation complete.');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  reconcileBalances().catch(e => {
    console.error('[Reconcile] Fatal error:', e);
    process.exit(1);
  });
}

module.exports = { reconcileBalances };
