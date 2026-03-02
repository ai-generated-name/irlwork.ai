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

  // Get all users with Circle wallets
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, circle_wallet_id, circle_wallet_address, usdc_available_balance, usdc_escrow_balance')
    .not('circle_wallet_id', 'is', null);

  if (error) {
    console.error('[Reconcile] Failed to fetch users:', error.message);
    process.exit(1);
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

      // Sum all users' escrow balances
      const { data: escrowSum } = await supabase
        .rpc('sum_column', { table_name: 'users', column_name: 'usdc_escrow_balance' })
        .single();

      // Fallback: manual sum if RPC not available
      let totalDbEscrow = 0;
      if (escrowSum) {
        totalDbEscrow = parseFloat(escrowSum);
      } else {
        for (const u of users) {
          totalDbEscrow += parseFloat(u.usdc_escrow_balance || '0');
        }
      }

      const diff = Math.abs(escrowOnChain - totalDbEscrow);
      if (diff > 0.01) {
        discrepancies++;
        console.warn(
          `[Reconcile] ESCROW WALLET DISCREPANCY: ` +
          `on-chain=${escrowOnChain.toFixed(6)}, db_sum=${totalDbEscrow.toFixed(6)}, ` +
          `diff=${diff.toFixed(6)}`
        );
      } else {
        console.log(`[Reconcile] Escrow wallet OK: on-chain=${escrowOnChain.toFixed(6)}, db_sum=${totalDbEscrow.toFixed(6)}`);
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
