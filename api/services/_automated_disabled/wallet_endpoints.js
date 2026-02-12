/**
 * Wallet API Endpoints for Pending/Available Balance System
 *
 * Add these endpoints to your server.js file
 *
 * Required imports:
 *   const { getWalletBalance } = require('../backend/services/paymentService');
 *   const { processWithdrawal, getWithdrawalHistory } = require('../backend/services/withdrawalService');
 *   const { sendUSDC, initWallet } = require('../backend/lib/wallet');
 */

// ============================================================================
// GET /api/wallet/balance - Get wallet balance with pending/available breakdown
// ============================================================================
app.get('/api/wallet/balance', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { getWalletBalance } = require('../backend/services/paymentService');
    const balance = await getWalletBalance(supabase, user.id);

    res.json({
      user_id: user.id,
      wallet_address: user.wallet_address,
      has_wallet: !!user.wallet_address,
      ...balance
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// ============================================================================
// POST /api/wallet/withdraw - Request withdrawal from available balance
// ============================================================================
app.post('/api/wallet/withdraw', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Optional: specify amount in cents, or omit to withdraw all available
    const { amount_cents } = req.body;

    const { processWithdrawal } = require('../backend/services/withdrawalService');
    const { sendUSDC, initWallet } = require('../backend/lib/wallet');

    // Initialize wallet if needed
    if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      await initWallet();
    }

    const result = await processWithdrawal(
      supabase,
      user.id,
      amount_cents || null,
      sendUSDC,
      createNotification
    );

    res.json(result);
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(400).json({
      error: error.message || 'Withdrawal failed'
    });
  }
});

// ============================================================================
// GET /api/wallet/withdrawals - Get withdrawal history
// ============================================================================
app.get('/api/wallet/withdrawals', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { getWithdrawalHistory } = require('../backend/services/withdrawalService');
    const history = await getWithdrawalHistory(supabase, user.id);

    res.json(history);
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

// ============================================================================
// GET /api/wallet/status - Updated endpoint with pending/available balance
// ============================================================================
// REPLACE the existing /api/wallet/status endpoint with this version:
app.get('/api/wallet/status', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { getWalletBalance } = require('../backend/services/paymentService');
    const balance = await getWalletBalance(supabase, user.id);

    // Also get on-chain USDC balance if wallet is configured
    let onChainBalance = 0;
    if (user.wallet_address && process.env.BASE_RPC_URL) {
      try {
        const { getBalance } = require('../backend/lib/wallet');
        onChainBalance = await getBalance(user.wallet_address);
      } catch (e) {
        console.error('Error fetching on-chain balance:', e);
      }
    }

    res.json({
      wallet_address: user.wallet_address,
      has_wallet: !!user.wallet_address,
      currency: 'USDC',

      // Platform-tracked balances
      pending: balance.pending,           // Funds in 48-hour dispute window
      available: balance.available,       // Funds ready to withdraw
      total: balance.total,               // pending + available

      // Breakdown in cents
      pending_cents: balance.pending_cents,
      available_cents: balance.available_cents,
      total_cents: balance.total_cents,

      // On-chain balance (for reference)
      on_chain_balance: onChainBalance,

      // Transaction details
      transactions: balance.transactions
    });
  } catch (error) {
    console.error('Error fetching wallet status:', error);
    res.status(500).json({ error: 'Failed to fetch wallet status' });
  }
});

// ============================================================================
// GET /api/admin/pending-stats - Admin endpoint to monitor pending balances
// ============================================================================
app.get('/api/admin/pending-stats', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get aggregate stats
    const { data: stats, error } = await supabase
      .from('pending_transactions')
      .select('status, amount_cents')
      .in('status', ['pending', 'available', 'frozen']);

    if (error) throw error;

    const pending = stats.filter(s => s.status === 'pending');
    const available = stats.filter(s => s.status === 'available');
    const frozen = stats.filter(s => s.status === 'frozen');

    const pendingTotal = pending.reduce((sum, s) => sum + s.amount_cents, 0) / 100;
    const availableTotal = available.reduce((sum, s) => sum + s.amount_cents, 0) / 100;
    const frozenTotal = frozen.reduce((sum, s) => sum + s.amount_cents, 0) / 100;

    res.json({
      pending: {
        count: pending.length,
        total: pendingTotal
      },
      available: {
        count: available.length,
        total: availableTotal
      },
      frozen: {
        count: frozen.length,
        total: frozenTotal
      },
      grand_total: pendingTotal + availableTotal + frozenTotal
    });
  } catch (error) {
    console.error('Error fetching pending stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
