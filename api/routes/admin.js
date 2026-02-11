/**
 * Admin Routes - Phase 1 Manual Operations
 *
 * All routes require admin authentication.
 * Use Postman/curl to interact with these endpoints during Phase 1.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Platform fee (15%)
const PLATFORM_FEE_PERCENT = 0.15;

// Cents-based fee calculation to avoid floating-point rounding errors
function calculateFees(depositAmount) {
  const depositCents = Math.round(parseFloat(depositAmount) * 100);
  const platformFeeCents = Math.round(depositCents * PLATFORM_FEE_PERCENT);
  const workerCents = depositCents - platformFeeCents;
  return {
    worker_amount: (workerCents / 100).toFixed(2),
    platform_fee: (platformFeeCents / 100).toFixed(2)
  };
}

/**
 * Initialize admin routes with dependencies
 * @param {Object} supabase - Supabase client
 * @param {Function} getUserByToken - Token validation function
 * @param {Function} createNotification - Notification creation function
 */
function initAdminRoutes(supabase, getUserByToken, createNotification) {
  // Middleware to set req.user
  const setUser = async (req, res, next) => {
    try {
      const token = req.headers.authorization || req.headers['x-api-key'];
      if (token && supabase) {
        req.user = await getUserByToken(token);
      }
      next();
    } catch (error) {
      console.error('[Admin] Error setting user:', error.message);
      next();
    }
  };

  // Admin auth middleware
  const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

  const adminAuth = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!ADMIN_USER_IDS.includes(req.user.id)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Apply middleware to all routes
  router.use(setUser);
  router.use(adminAuth);

  // Helper to log admin actions
  const logAdminAction = async (adminId, action, taskId, paymentId, requestBody) => {
    try {
      await supabase.from('admin_audit_log').insert({
        id: uuidv4(),
        admin_id: adminId,
        action,
        task_id: taskId || null,
        payment_id: paymentId || null,
        request_body: requestBody || null,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Admin] Failed to log action:', error.message);
    }
  };

  // ============================================================================
  // GET /api/admin/dashboard - Summary stats with separate queues
  // ============================================================================
  router.get('/dashboard', async (req, res) => {
    try {
      // Pending deposits
      const { data: pendingDeposits } = await supabase
        .from('tasks')
        .select('id, escrow_amount')
        .eq('escrow_status', 'pending_deposit');

      // Stale deposits (>48h)
      const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: staleDeposits } = await supabase
        .from('tasks')
        .select('id')
        .eq('escrow_status', 'pending_deposit')
        .lt('updated_at', staleThreshold);

      // Work in progress (deposited)
      const { data: inProgress } = await supabase
        .from('tasks')
        .select('id, escrow_amount')
        .eq('escrow_status', 'deposited')
        .eq('status', 'in_progress');

      // Pending agent approval (proof submitted)
      const { data: pendingAgentApproval } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'pending_review')
        .eq('escrow_status', 'deposited');

      // Pending release (agent approved, awaiting admin)
      const { data: pendingRelease } = await supabase
        .from('tasks')
        .select('id, escrow_amount')
        .eq('status', 'approved')
        .eq('escrow_status', 'deposited');

      // Pending withdrawals
      const { data: pendingWithdrawals } = await supabase
        .from('manual_payments')
        .select('id, worker_amount')
        .eq('status', 'pending_withdrawal');

      // Total platform fees (from completed payments)
      const { data: completedPayments } = await supabase
        .from('manual_payments')
        .select('platform_fee')
        .eq('status', 'withdrawn');

      // Pending reports
      const { data: pendingReports } = await supabase
        .from('task_reports')
        .select('id')
        .eq('status', 'pending');

      // Total payments processed
      const { data: allPayments } = await supabase
        .from('manual_payments')
        .select('deposit_amount')
        .in('status', ['deposited', 'released', 'pending_withdrawal', 'withdrawn']);

      // Pending feedback
      const { data: pendingFeedback } = await supabase
        .from('feedback')
        .select('id')
        .in('status', ['new', 'in_review']);

      // Calculate totals
      const pendingDepositsTotal = (pendingDeposits || []).reduce((sum, t) => sum + (t.escrow_amount || 0), 0);
      const inProgressTotal = (inProgress || []).reduce((sum, t) => sum + (t.escrow_amount || 0), 0);
      const pendingReleaseTotal = (pendingRelease || []).reduce((sum, t) => sum + (t.escrow_amount || 0), 0);
      const pendingWithdrawalsTotal = (pendingWithdrawals || []).reduce((sum, p) => sum + (parseFloat(p.worker_amount) || 0), 0);
      const platformFeesTotal = (completedPayments || []).reduce((sum, p) => sum + (parseFloat(p.platform_fee) || 0), 0);
      const totalProcessed = (allPayments || []).reduce((sum, p) => sum + (parseFloat(p.deposit_amount) || 0), 0);

      res.json({
        pending_deposits: {
          count: (pendingDeposits || []).length,
          total_usdc: pendingDepositsTotal
        },
        stale_deposits_48h: {
          count: (staleDeposits || []).length,
          alert: (staleDeposits || []).length > 0
        },
        work_in_progress: {
          count: (inProgress || []).length,
          total_usdc_held: inProgressTotal
        },
        pending_agent_approval: {
          count: (pendingAgentApproval || []).length
        },
        pending_release: {
          count: (pendingRelease || []).length,
          total_usdc_to_release: pendingReleaseTotal
        },
        pending_withdrawals: {
          count: (pendingWithdrawals || []).length,
          total_usdc_to_send: pendingWithdrawalsTotal
        },
        pending_reports: {
          count: (pendingReports || []).length
        },
        totals: {
          platform_fees_earned: platformFeesTotal,
          total_usdc_processed: totalProcessed
        },
        feedback: {
          count: (pendingFeedback || []).length
        }
      });
    } catch (error) {
      console.error('[Admin] Dashboard error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/pending-deposits - Tasks awaiting deposit confirmation
  // ============================================================================
  router.get('/tasks/pending-deposits', async (req, res) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, escrow_amount, unique_deposit_amount, created_at, updated_at,
          agent:users!tasks_agent_id_fkey(id, name, email),
          human:users!tasks_human_id_fkey(id, name, email)
        `)
        .eq('escrow_status', 'pending_deposit')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      // Add hours_pending calculation
      const tasksWithHours = (tasks || []).map(task => ({
        ...task,
        hours_pending: Math.round((Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60)),
        expected_deposit: task.unique_deposit_amount || task.escrow_amount,
        platform_wallet: process.env.PLATFORM_WALLET_ADDRESS
      }));

      res.json(tasksWithHours);
    } catch (error) {
      console.error('[Admin] Pending deposits error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/stale-deposits - Pending deposits >48h (unfunded)
  // ============================================================================
  router.get('/tasks/stale-deposits', async (req, res) => {
    try {
      const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, escrow_amount, unique_deposit_amount, created_at, updated_at,
          agent:users!tasks_agent_id_fkey(id, name, email),
          human:users!tasks_human_id_fkey(id, name, email)
        `)
        .eq('escrow_status', 'pending_deposit')
        .lt('updated_at', staleThreshold)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      const tasksWithHours = (tasks || []).map(task => ({
        ...task,
        hours_pending: Math.round((Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60)),
        expected_deposit: task.unique_deposit_amount || task.escrow_amount
      }));

      res.json(tasksWithHours);
    } catch (error) {
      console.error('[Admin] Stale deposits error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/tasks/:id/confirm-deposit - Confirm on-chain deposit
  // ============================================================================
  router.post('/tasks/:id/confirm-deposit', async (req, res) => {
    try {
      const { id } = req.params;
      const { tx_hash, amount_received, notes } = req.body;

      if (!tx_hash || amount_received === undefined) {
        return res.status(400).json({ error: 'tx_hash and amount_received are required' });
      }

      // Get task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, human:users!tasks_human_id_fkey(id, name, email), agent:users!tasks_agent_id_fkey(id, name, email)')
        .eq('id', id)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.escrow_status !== 'pending_deposit') {
        return res.status(400).json({ error: `Task escrow_status is ${task.escrow_status}, expected pending_deposit` });
      }

      // Validate amount
      const expectedAmount = task.unique_deposit_amount || task.escrow_amount;
      const amountDiff = Math.abs(amount_received - expectedAmount);
      const isWithinTolerance = amountDiff <= 0.01;

      let depositStatus = 'confirmed';
      if (!isWithinTolerance) {
        if (!notes) {
          return res.status(400).json({
            error: 'Amount mismatch requires notes',
            expected: expectedAmount,
            received: amount_received,
            difference: amountDiff
          });
        }
        depositStatus = 'mismatched';
      }

      // Create manual_payments record (single source of truth)
      const paymentId = uuidv4();
      const { error: paymentError } = await supabase
        .from('manual_payments')
        .insert({
          id: paymentId,
          task_id: id,
          worker_id: task.human_id,
          agent_id: task.agent_id,
          expected_amount: expectedAmount,
          deposit_amount: amount_received,
          deposit_tx_hash: tx_hash,
          deposit_status: depositStatus,
          deposit_notes: notes || null,
          status: 'deposited',
          deposit_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // Update task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'deposited',
          status: 'in_progress',
          work_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify human
      await createNotification(
        task.human_id,
        'deposit_confirmed',
        'Funding Confirmed!',
        `Funding confirmed for "${task.title}". You may begin work now.`,
        `/tasks/${id}`
      );

      // Notify agent
      await createNotification(
        task.agent_id,
        'deposit_confirmed',
        'Deposit Confirmed',
        `Your deposit for "${task.title}" has been confirmed.`,
        `/tasks/${id}`
      );

      // Log admin action
      await logAdminAction(req.user.id, 'confirm_deposit', id, paymentId, { tx_hash, amount_received, notes });

      res.json({
        success: true,
        payment_id: paymentId,
        deposit_status: depositStatus,
        message: depositStatus === 'confirmed'
          ? 'Deposit confirmed. Human has been notified to begin work.'
          : 'Deposit confirmed with mismatch noted. Human has been notified to begin work.'
      });
    } catch (error) {
      console.error('[Admin] Confirm deposit error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/tasks/:id/cancel-assignment - Cancel unfunded assignment
  // ============================================================================
  router.post('/tasks/:id/cancel-assignment', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Get task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, human:users!tasks_human_id_fkey(id, name, email), agent:users!tasks_agent_id_fkey(id, name, email)')
        .eq('id', id)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.escrow_status !== 'pending_deposit') {
        return res.status(400).json({ error: `Task escrow_status is ${task.escrow_status}, expected pending_deposit` });
      }

      const humanId = task.human_id;
      const agentId = task.agent_id;

      // Reset task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'awaiting_worker',
          status: 'open',
          human_id: null,
          unique_deposit_amount: null,
          deposit_amount_cents: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Reset application status
      if (humanId) {
        await supabase
          .from('task_applications')
          .update({ status: 'cancelled' })
          .eq('task_id', id)
          .eq('human_id', humanId);
      }

      // Notify human
      if (humanId) {
        await createNotification(
          humanId,
          'assignment_cancelled',
          'Assignment Cancelled',
          `Your assignment for "${task.title}" was cancelled due to unfunded escrow. The task is now open for new applications.`,
          `/browse`
        );
      }

      // Notify agent
      if (agentId) {
        await createNotification(
          agentId,
          'assignment_cancelled',
          'Assignment Cancelled',
          `The assignment for "${task.title}" was cancelled due to unfunded escrow.${reason ? ` Reason: ${reason}` : ''}`,
          `/tasks/${id}`
        );
      }

      // Log admin action
      await logAdminAction(req.user.id, 'cancel_assignment', id, null, { reason, worker_id: humanId });

      res.json({
        success: true,
        message: 'Assignment cancelled. Task is now open for new applications.'
      });
    } catch (error) {
      console.error('[Admin] Cancel assignment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/pending-agent-approval - Proofs awaiting agent
  // ============================================================================
  router.get('/tasks/pending-agent-approval', async (req, res) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, escrow_amount, proof_submitted_at, updated_at,
          agent:users!tasks_agent_id_fkey(id, name, email),
          human:users!tasks_human_id_fkey(id, name, email)
        `)
        .eq('status', 'pending_review')
        .eq('escrow_status', 'deposited')
        .order('proof_submitted_at', { ascending: true });

      if (error) throw error;

      // Add hours_waiting calculation
      const tasksWithHours = (tasks || []).map(task => ({
        ...task,
        hours_waiting: Math.round((Date.now() - new Date(task.proof_submitted_at || task.updated_at).getTime()) / (1000 * 60 * 60))
      }));

      res.json(tasksWithHours);
    } catch (error) {
      console.error('[Admin] Pending agent approval error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/pending-release - Agent approved, awaiting admin release
  // ============================================================================
  router.get('/tasks/pending-release', async (req, res) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, escrow_amount, updated_at,
          agent:users!tasks_agent_id_fkey(id, name, email),
          human:users!tasks_human_id_fkey(id, name, email, stripe_account_id)
        `)
        .eq('status', 'approved')
        .eq('escrow_status', 'deposited')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      // Get manual_payments for deposit info
      const taskIds = (tasks || []).map(t => t.id);
      const { data: payments } = await supabase
        .from('manual_payments')
        .select('task_id, deposit_amount, deposit_status')
        .in('task_id', taskIds);

      const paymentMap = {};
      (payments || []).forEach(p => { paymentMap[p.task_id] = p; });

      const tasksWithPayment = (tasks || []).map(task => ({
        ...task,
        deposit_amount: paymentMap[task.id]?.deposit_amount || task.escrow_amount,
        deposit_status: paymentMap[task.id]?.deposit_status || 'unknown',
        ...calculateFees(paymentMap[task.id]?.deposit_amount || task.escrow_amount)
      }));

      res.json(tasksWithPayment);
    } catch (error) {
      console.error('[Admin] Pending release error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/:id - Full task detail with payment history
  // NOTE: This route MUST come after all /tasks/specific-path routes
  // ============================================================================
  router.get('/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data: task, error } = await supabase
        .from('tasks')
        .select(`
          *,
          agent:users!tasks_agent_id_fkey(id, name, email, stripe_account_id),
          human:users!tasks_human_id_fkey(id, name, email, stripe_account_id)
        `)
        .eq('id', id)
        .single();

      if (error || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Get payment history
      const { data: payments } = await supabase
        .from('manual_payments')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: false });

      // Get proofs
      const { data: proofs } = await supabase
        .from('task_proofs')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: false });

      res.json({
        task,
        payments: payments || [],
        proofs: proofs || []
      });
    } catch (error) {
      console.error('[Admin] Task detail error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/tasks/:id/release-payment - Release payment (fees calculated server-side)
  // ============================================================================
  router.post('/tasks/:id/release-payment', async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      // Get task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, human:users!tasks_human_id_fkey(id, name, email, stripe_account_id)')
        .eq('id', id)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.status !== 'approved' || task.escrow_status !== 'deposited') {
        return res.status(400).json({
          error: `Task must be in approved status with deposited escrow. Current: status=${task.status}, escrow_status=${task.escrow_status}`
        });
      }

      // Get manual_payment record
      const { data: payment, error: paymentError } = await supabase
        .from('manual_payments')
        .select('*')
        .eq('task_id', id)
        .eq('status', 'deposited')
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({ error: 'Manual payment record not found' });
      }

      // Calculate fees server-side (cents-based to avoid rounding errors)
      const { worker_amount: humanAmount, platform_fee: platformFee } = calculateFees(payment.deposit_amount);

      // Atomic update: include status check to prevent double-release race condition
      const { data: updatedPayment, error: updatePaymentError } = await supabase
        .from('manual_payments')
        .update({
          worker_amount: humanAmount,
          platform_fee: platformFee,
          status: 'pending_withdrawal',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
        .eq('status', 'deposited')
        .select('id')
        .single();

      if (updatePaymentError || !updatedPayment) {
        return res.status(409).json({ error: 'Payment has already been released or is being processed' });
      }

      // Update task
      const { error: updateTaskError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'released',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateTaskError) throw updateTaskError;

      // Notify human
      await createNotification(
        task.human_id,
        'payment_approved',
        'Payment Approved!',
        `Your payment of $${humanAmount} USD for "${task.title}" has been approved. Withdrawal is being processed.`,
        `/tasks/${id}`
      );

      // Log admin action
      await logAdminAction(req.user.id, 'release_payment', id, payment.id, { notes, worker_amount: humanAmount, platform_fee: platformFee });

      res.json({
        success: true,
        payment_id: payment.id,
        deposit_amount: depositAmount,
        worker_amount: parseFloat(humanAmount),
        platform_fee: parseFloat(platformFee),
        worker_stripe_account: task.human?.stripe_account_id || null,
        message: 'Payment released. Ready for withdrawal confirmation.'
      });
    } catch (error) {
      console.error('[Admin] Release payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/payments/pending-withdrawals - Payments ready for transfer
  // ============================================================================
  router.get('/payments/pending-withdrawals', async (req, res) => {
    try {
      const { data: payments, error } = await supabase
        .from('manual_payments')
        .select(`
          *,
          task:tasks(id, title),
          worker:users!manual_payments_worker_id_fkey(id, name, email, stripe_account_id)
        `)
        .eq('status', 'pending_withdrawal')
        .order('released_at', { ascending: true });

      if (error) throw error;

      res.json(payments || []);
    } catch (error) {
      console.error('[Admin] Pending withdrawals error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/payments/:id/confirm-withdrawal - DEPRECATED (was USDC)
  // Withdrawals are now handled automatically via Stripe Connect transfers.
  // ============================================================================
  router.post('/payments/:id/confirm-withdrawal', async (req, res) => {
    res.status(410).json({
      error: 'This endpoint is deprecated. Withdrawals are now handled automatically via Stripe Connect.',
      message: 'Workers withdraw directly to their bank account through Stripe Connect.'
    });
  });

  // ============================================================================
  // POST /api/admin/tasks/:id/refund - Refund agent via Stripe
  // ============================================================================
  router.post('/tasks/:id/refund', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'reason is required' });
      }

      // Get task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*, agent:users!tasks_agent_id_fkey(id, name, email)')
        .eq('id', id)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Refund via Stripe
      const { refundPayment } = require('../backend/services/stripeService');
      let refundResult;
      try {
        refundResult = await refundPayment(supabase, id, 'requested_by_customer');
      } catch (refundError) {
        return res.status(400).json({
          error: 'Stripe refund failed',
          details: refundError.message
        });
      }

      // Cancel any pending transactions for this task
      await supabase
        .from('pending_transactions')
        .update({ status: 'cancelled', notes: `Refunded: ${reason}` })
        .eq('task_id', id)
        .in('status', ['pending', 'available', 'frozen']);

      // Update task status
      await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Notify agent
      await createNotification(
        task.agent_id,
        'refund_processed',
        'Refund Processed',
        `Your refund of $${(refundResult.amount / 100).toFixed(2)} for "${task.title}" has been processed and will be returned to your card.`,
        null
      );

      // Log admin action
      await logAdminAction(req.user.id, 'refund', id, null, { refund_id: refundResult.refund_id, reason });

      res.json({
        success: true,
        refund_id: refundResult.refund_id,
        amount: refundResult.amount,
        message: 'Refund processed via Stripe. Agent has been notified.'
      });
    } catch (error) {
      console.error('[Admin] Refund error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/reports - List task reports for admin review
  // ============================================================================
  router.get('/reports', async (req, res) => {
    try {
      const { status = 'pending', reason, task_id, page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('task_reports')
        .select('*', { count: 'exact' });

      if (status && status !== 'all') query = query.eq('status', status);
      if (reason) query = query.eq('reason', reason);
      if (task_id) query = query.eq('task_id', task_id);

      query = query.order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      const { data: reports, error, count } = await query;
      if (error) throw error;

      // Fetch related data for each report
      const enrichedReports = [];
      for (const report of (reports || [])) {
        // Get reporter info
        const { data: reporter } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', report.reporter_id)
          .single();

        // Get task + agent info
        const { data: task } = await supabase
          .from('tasks')
          .select('id, title, status, moderation_status, report_count, agent_id, escrow_status, human_id')
          .eq('id', report.task_id)
          .single();

        let agent = null;
        if (task?.agent_id) {
          const { data: agentData } = await supabase
            .from('users')
            .select('id, name, email, total_reports_received, moderation_status, warning_count')
            .eq('id', task.agent_id)
            .single();
          agent = agentData;
        }

        // Get resolver info if resolved
        let resolvedByUser = null;
        if (report.resolved_by) {
          const { data: resolver } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', report.resolved_by)
            .single();
          resolvedByUser = resolver;
        }

        enrichedReports.push({
          ...report,
          reporter,
          task: task ? { ...task, agent } : null,
          resolved_by_user: resolvedByUser
        });
      }

      res.json({
        reports: enrichedReports,
        total: count || 0,
        page: pageNum,
        limit: limitNum
      });
    } catch (error) {
      console.error('[Admin] Reports list error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/feedback - List all feedback
  // ============================================================================
  router.get('/feedback', async (req, res) => {
    try {
      const { status, urgency, type, limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('feedback')
        .select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (urgency) query = query.eq('urgency', urgency);
      if (type) query = query.eq('type', type);

      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Sort with urgency priority: critical > high > normal > low
      const urgencyRank = { critical: 0, high: 1, normal: 2, low: 3 };
      const sorted = (data || []).sort((a, b) => {
        const ua = urgencyRank[a.urgency] ?? 4;
        const ub = urgencyRank[b.urgency] ?? 4;
        if (ua !== ub) return ua - ub;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      res.json({ items: sorted, total: count || 0 });
    } catch (error) {
      console.error('[Admin] Feedback list error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/reports/:id/resolve - Resolve a task report
  // ============================================================================
  router.post('/reports/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes, suspend_days } = req.body;

      const VALID_ACTIONS = ['no_action', 'warning_issued', 'task_hidden', 'task_removed', 'user_suspended', 'user_banned'];
      if (!action || !VALID_ACTIONS.includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be one of: ' + VALID_ACTIONS.join(', ') });
      }

      // Get report
      const { data: report, error: reportError } = await supabase
        .from('task_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (reportError || !report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status === 'resolved' || report.status === 'dismissed') {
        return res.status(400).json({ error: 'Report has already been resolved' });
      }

      // Get task with creator info
      const { data: task } = await supabase
        .from('tasks')
        .select('id, title, agent_id, status, escrow_status, human_id')
        .eq('id', report.task_id)
        .single();

      if (!task) {
        return res.status(404).json({ error: 'Associated task not found' });
      }

      const taskCreatorId = task.agent_id;

      // Get creator info for warning_count
      const { data: creator } = await supabase
        .from('users')
        .select('id, warning_count, total_reports_upheld')
        .eq('id', taskCreatorId)
        .single();

      // 1. Update report record
      await supabase.from('task_reports').update({
        status: action === 'no_action' ? 'dismissed' : 'resolved',
        resolved_by: req.user.id,
        resolution_action: action,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', id);

      // 2. Apply action to task
      if (action === 'task_hidden') {
        await supabase.from('tasks').update({
          moderation_status: 'hidden',
          hidden_at: new Date().toISOString(),
          hidden_reason: notes || 'Hidden by admin review',
          updated_at: new Date().toISOString()
        }).eq('id', task.id);
      } else if (action === 'task_removed') {
        await supabase.from('tasks').update({
          moderation_status: 'removed',
          status: 'cancelled',
          hidden_at: new Date().toISOString(),
          hidden_reason: notes || 'Removed by admin review',
          updated_at: new Date().toISOString()
        }).eq('id', task.id);
      }

      // 3. Apply action to user
      if (action === 'warning_issued') {
        await supabase.from('users').update({
          warning_count: ((creator?.warning_count) || 0) + 1,
          moderation_status: 'warned',
          updated_at: new Date().toISOString()
        }).eq('id', taskCreatorId);
      } else if (action === 'user_suspended') {
        const suspendUntil = new Date(Date.now() + (suspend_days || 7) * 24 * 60 * 60 * 1000);
        await supabase.from('users').update({
          moderation_status: 'suspended',
          suspended_until: suspendUntil.toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', taskCreatorId);
      } else if (action === 'user_banned') {
        await supabase.from('users').update({
          moderation_status: 'banned',
          updated_at: new Date().toISOString()
        }).eq('id', taskCreatorId);
      }

      // 4. Increment total_reports_upheld if action was taken
      if (action !== 'no_action') {
        await supabase.from('users').update({
          total_reports_upheld: ((creator?.total_reports_upheld) || 0) + 1
        }).eq('id', taskCreatorId);
      }

      // 5. Notify task creator (without revealing reporter)
      if (action !== 'no_action') {
        const actionMessages = {
          'warning_issued': `Your task "${task.title}" was flagged for review and a warning has been issued. Please review our community guidelines.`,
          'task_hidden': `Your task "${task.title}" has been hidden from search results due to a policy violation. Please contact support for details.`,
          'task_removed': `Your task "${task.title}" has been removed for violating platform rules.${notes ? ' Reason: ' + notes : ''}`,
          'user_suspended': `Your account has been temporarily suspended due to violations on task "${task.title}". Suspension ends on ${new Date(Date.now() + (suspend_days || 7) * 86400000).toLocaleDateString()}.`,
          'user_banned': 'Your account has been permanently banned due to severe violations.'
        };

        await createNotification(
          taskCreatorId,
          'moderation_action',
          'Moderation Action Taken',
          actionMessages[action],
          action === 'task_removed' ? null : `/tasks/${task.id}`
        );

        // Notify worker if task is in-progress and being removed
        if (task.human_id && ['task_removed', 'task_hidden'].includes(action) && ['in_progress', 'pending_review'].includes(task.status)) {
          await createNotification(
            task.human_id,
            'task_under_review',
            'Task Under Review',
            `The task "${task.title}" you are working on is under moderation review. Your work and payment are protected.`,
            `/tasks/${task.id}`
          );
        }
      }

      // 6. Notify reporter
      await createNotification(
        report.reporter_id,
        'report_reviewed',
        'Report Reviewed',
        action === 'no_action'
          ? 'We reviewed your report and determined no action was needed at this time. Thank you for helping keep the platform safe.'
          : 'Thank you for your report. We have taken action based on your feedback.',
        null
      );

      // 7. Batch-resolve other pending reports for same task (if task-level action taken)
      if (['task_hidden', 'task_removed'].includes(action)) {
        const { data: otherReports } = await supabase
          .from('task_reports')
          .select('id, reporter_id')
          .eq('task_id', task.id)
          .eq('status', 'pending')
          .neq('id', id);

        if (otherReports && otherReports.length > 0) {
          await supabase.from('task_reports').update({
            status: 'resolved',
            resolved_by: req.user.id,
            resolution_action: action,
            resolution_notes: `Batch resolved: ${notes || 'Task-level action taken'}`,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('task_id', task.id)
          .eq('status', 'pending')
          .neq('id', id);

          // Notify other reporters
          for (const other of otherReports) {
            await createNotification(
              other.reporter_id,
              'report_reviewed',
              'Report Reviewed',
              'Thank you for your report. We have taken action based on community feedback.',
              null
            );
          }
        }
      }

      // 8. Log admin action
      await logAdminAction(req.user.id, 'resolve_report', task.id, null, {
        report_id: id,
        action,
        notes,
        suspend_days
      });

      // Build response with escrow warning if applicable
      const response = {
        success: true,
        action,
        message: `Report resolved with action: ${action.replace(/_/g, ' ')}`
      };

      if (action === 'task_removed' && task.escrow_status === 'deposited') {
        response.escrow_warning = `This task has active escrow. Please process a refund separately via POST /api/admin/tasks/${task.id}/refund`;
      }

      res.json(response);
    } catch (error) {
      console.error('[Admin] Resolve report error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PUT /api/admin/feedback/:id/status - Update feedback status
  // ============================================================================
  router.put('/feedback/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const validStatuses = ['new', 'in_review', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      if (admin_notes !== undefined) {
        updates.admin_notes = admin_notes;
      }

      if (status === 'resolved') {
        updates.resolved_by = req.user.id;
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('feedback')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await logAdminAction(req.user.id, 'update_feedback_status', null, null, { feedback_id: id, status, admin_notes });

      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] Feedback status update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = initAdminRoutes;
