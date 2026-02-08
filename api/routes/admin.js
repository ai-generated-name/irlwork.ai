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

      // Total USDC processed
      const { data: allPayments } = await supabase
        .from('manual_payments')
        .select('deposit_amount')
        .in('status', ['deposited', 'released', 'pending_withdrawal', 'withdrawn']);

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
        totals: {
          platform_fees_earned: platformFeesTotal,
          total_usdc_processed: totalProcessed
        }
      });
    } catch (error) {
      console.error('[Admin] Dashboard error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/tasks/pending-deposits - Tasks awaiting USDC deposit
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

      // Notify worker
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
          ? 'Deposit confirmed. Worker has been notified to begin work.'
          : 'Deposit confirmed with mismatch noted. Worker has been notified to begin work.'
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

      const workerId = task.human_id;
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
      if (workerId) {
        await supabase
          .from('task_applications')
          .update({ status: 'cancelled' })
          .eq('task_id', id)
          .eq('human_id', workerId);
      }

      // Notify worker
      if (workerId) {
        await createNotification(
          workerId,
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
      await logAdminAction(req.user.id, 'cancel_assignment', id, null, { reason, worker_id: workerId });

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
          human:users!tasks_human_id_fkey(id, name, email, circle_wallet_id)
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
        worker_amount: ((paymentMap[task.id]?.deposit_amount || task.escrow_amount) * (1 - PLATFORM_FEE_PERCENT)).toFixed(2),
        platform_fee: ((paymentMap[task.id]?.deposit_amount || task.escrow_amount) * PLATFORM_FEE_PERCENT).toFixed(2)
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
          agent:users!tasks_agent_id_fkey(id, name, email, circle_wallet_id),
          human:users!tasks_human_id_fkey(id, name, email, circle_wallet_id)
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
        .select('*, human:users!tasks_human_id_fkey(id, name, email, circle_wallet_id)')
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

      // Calculate fees server-side
      const depositAmount = parseFloat(payment.deposit_amount);
      const workerAmount = (depositAmount * (1 - PLATFORM_FEE_PERCENT)).toFixed(2);
      const platformFee = (depositAmount * PLATFORM_FEE_PERCENT).toFixed(2);

      // Update manual_payments
      const { error: updatePaymentError } = await supabase
        .from('manual_payments')
        .update({
          worker_amount: workerAmount,
          platform_fee: platformFee,
          status: 'pending_withdrawal',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updatePaymentError) throw updatePaymentError;

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

      // Notify worker
      await createNotification(
        task.human_id,
        'payment_approved',
        'Payment Approved!',
        `Your payment of $${workerAmount} USDC for "${task.title}" has been approved. Withdrawal is being processed.`,
        `/dashboard`
      );

      // Log admin action
      await logAdminAction(req.user.id, 'release_payment', id, payment.id, { notes, worker_amount: workerAmount, platform_fee: platformFee });

      res.json({
        success: true,
        payment_id: payment.id,
        deposit_amount: depositAmount,
        worker_amount: parseFloat(workerAmount),
        platform_fee: parseFloat(platformFee),
        worker_wallet: task.human?.circle_wallet_id || null,
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
          worker:users!manual_payments_worker_id_fkey(id, name, email, circle_wallet_id)
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
  // POST /api/admin/payments/:id/confirm-withdrawal - Confirm USDC sent
  // ============================================================================
  router.post('/payments/:id/confirm-withdrawal', async (req, res) => {
    try {
      const { id } = req.params;
      const { tx_hash, amount_sent } = req.body;

      if (!tx_hash) {
        return res.status(400).json({ error: 'tx_hash is required' });
      }

      // Get payment
      const { data: payment, error: paymentError } = await supabase
        .from('manual_payments')
        .select('*, task:tasks(id, title), worker:users!manual_payments_worker_id_fkey(id, name, email)')
        .eq('id', id)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status !== 'pending_withdrawal') {
        return res.status(400).json({ error: `Payment status is ${payment.status}, expected pending_withdrawal` });
      }

      // Update manual_payments
      const { error: updatePaymentError } = await supabase
        .from('manual_payments')
        .update({
          withdrawal_tx_hash: tx_hash,
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updatePaymentError) throw updatePaymentError;

      // Update task
      const { error: updateTaskError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'withdrawn',
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.task_id);

      if (updateTaskError) throw updateTaskError;

      // Update worker stats
      await supabase
        .from('users')
        .update({
          jobs_completed: supabase.raw('COALESCE(jobs_completed, 0) + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.worker_id);

      // Notify worker
      await createNotification(
        payment.worker_id,
        'payment_sent',
        'USDC Sent!',
        `Your payment of $${payment.worker_amount} USDC for "${payment.task?.title}" has been sent to your wallet. TX: ${tx_hash.substring(0, 10)}...`,
        `https://basescan.org/tx/${tx_hash}`
      );

      // Log admin action
      await logAdminAction(req.user.id, 'confirm_withdrawal', payment.task_id, id, { tx_hash, amount_sent });

      res.json({
        success: true,
        tx_hash,
        basescan_url: `https://basescan.org/tx/${tx_hash}`,
        message: 'Withdrawal confirmed. Worker has been notified.'
      });
    } catch (error) {
      console.error('[Admin] Confirm withdrawal error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/tasks/:id/refund - Refund agent
  // ============================================================================
  router.post('/tasks/:id/refund', async (req, res) => {
    try {
      const { id } = req.params;
      const { tx_hash, amount_refunded, reason } = req.body;

      if (!tx_hash || !reason) {
        return res.status(400).json({ error: 'tx_hash and reason are required' });
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

      // Get manual_payment if exists
      const { data: payment } = await supabase
        .from('manual_payments')
        .select('*')
        .eq('task_id', id)
        .single();

      // Update or create manual_payments record
      if (payment) {
        await supabase
          .from('manual_payments')
          .update({
            refund_tx_hash: tx_hash,
            refund_reason: reason,
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
      }

      // Update task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'refunded',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify agent
      await createNotification(
        task.agent_id,
        'refund_processed',
        'Refund Processed',
        `Your refund of $${amount_refunded || task.escrow_amount} USDC for "${task.title}" has been processed. TX: ${tx_hash.substring(0, 10)}...`,
        `https://basescan.org/tx/${tx_hash}`
      );

      // Log admin action
      await logAdminAction(req.user.id, 'refund', id, payment?.id, { tx_hash, amount_refunded, reason });

      res.json({
        success: true,
        tx_hash,
        basescan_url: `https://basescan.org/tx/${tx_hash}`,
        message: 'Refund processed. Agent has been notified.'
      });
    } catch (error) {
      console.error('[Admin] Refund error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = initAdminRoutes;
