/**
 * Admin Routes - Phase 1 Manual Operations
 *
 * All routes require admin authentication.
 * Use Postman/curl to interact with these endpoints during Phase 1.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { PLATFORM_FEE_PERCENT } = require('../config/constants');
const { getTierConfig } = require('../config/tiers');
const logger = require('../lib/logger').child({ service: 'admin' });
const { captureException } = require('../lib/sentry');

// Cents-based fee calculation to avoid floating-point rounding errors
// Accepts optional workerTier for tier-based fee calculation
function calculateFees(depositAmount, workerTier) {
  const depositCents = Math.round(parseFloat(depositAmount) * 100);
  const feePercent = workerTier ? getTierConfig(workerTier).worker_fee_percent : PLATFORM_FEE_PERCENT;
  const platformFeeCents = Math.round(depositCents * feePercent / 100);
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
      logger.error({ err: error, action, task_id: taskId }, 'Failed to log admin action');
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
          total_usd: pendingDepositsTotal
        },
        stale_deposits_48h: {
          count: (staleDeposits || []).length,
          alert: (staleDeposits || []).length > 0
        },
        work_in_progress: {
          count: (inProgress || []).length,
          total_usd_held: inProgressTotal
        },
        pending_agent_approval: {
          count: (pendingAgentApproval || []).length
        },
        pending_release: {
          count: (pendingRelease || []).length,
          total_usd_to_release: pendingReleaseTotal
        },
        pending_withdrawals: {
          count: (pendingWithdrawals || []).length,
          total_usd_to_send: pendingWithdrawalsTotal
        },
        pending_reports: {
          count: (pendingReports || []).length
        },
        totals: {
          platform_fees_earned: platformFeesTotal,
          total_usd_processed: totalProcessed
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
        expected_deposit: task.unique_deposit_amount || task.escrow_amount
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
      logger.error({ err: error }, 'Confirm deposit error');
      captureException(error, { tags: { admin_action: 'confirm_deposit' } });
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

  // ============================================================
  // GET /tasks/recent — Live feed: recent tasks with counts
  // ============================================================
  router.get('/tasks/recent', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const status = req.query.status || null;

      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: tasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return res.json([]);

      const taskIds = tasks.map(t => t.id);

      const [appResult, viewResult, agentResult] = await Promise.all([
        supabase.from('task_applications').select('task_id').in('task_id', taskIds),
        supabase.from('page_views').select('target_id').eq('page_type', 'task').in('target_id', taskIds),
        supabase.from('users').select('id, name').in('id', [...new Set(tasks.map(t => t.agent_id).filter(Boolean))]),
      ]);

      const appCounts = {};
      (appResult.data || []).forEach(a => { appCounts[a.task_id] = (appCounts[a.task_id] || 0) + 1; });

      const viewCounts = {};
      (viewResult.data || []).forEach(v => { viewCounts[v.target_id] = (viewCounts[v.target_id] || 0) + 1; });

      const agentNames = {};
      (agentResult.data || []).forEach(a => { agentNames[a.id] = a.name; });

      const enriched = tasks.map(t => ({
        ...t,
        applicant_count: appCounts[t.id] || 0,
        view_count: viewCounts[t.id] || 0,
        agent_name: agentNames[t.agent_id] || 'Unknown',
        spots_filled: Array.isArray(t.human_ids) ? t.human_ids.length : 0,
      }));

      res.json(enriched);
    } catch (error) {
      logger.error({ err: error }, 'Recent tasks endpoint error');
      captureException(error, { tags: { admin_action: 'tasks_recent' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // GET /tasks/search — Searchable, filterable, paginated task list
  // ============================================================
  router.get('/tasks/search', async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = (page - 1) * limit;
      const q = (req.query.q || '').trim();
      const status = req.query.status || null;
      const category = req.query.category || null;
      const moderation = req.query.moderation || null;
      const sort = req.query.sort || 'newest';

      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' });

      // Text search
      if (q) {
        const sanitized = q.replace(/[%_]/g, '');
        query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
      }

      // Filters
      if (status && status !== 'all') query = query.eq('status', status);
      if (category && category !== 'all') query = query.eq('category', category);
      if (moderation && moderation !== 'all') query = query.eq('moderation_status', moderation);

      // Sort
      if (sort === 'oldest') query = query.order('created_at', { ascending: true });
      else if (sort === 'budget_high') query = query.order('budget', { ascending: false });
      else if (sort === 'budget_low') query = query.order('budget', { ascending: true });
      else query = query.order('created_at', { ascending: false }); // newest (default)

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data: tasks, error: tasksError, count: total } = await query;
      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return res.json({ tasks: [], total: 0, page, limit });

      const taskIds = tasks.map(t => t.id);

      // Enrich with counts + agent names
      const [appResult, viewResult, agentResult] = await Promise.all([
        supabase.from('task_applications').select('task_id').in('task_id', taskIds),
        supabase.from('page_views').select('target_id').eq('page_type', 'task').in('target_id', taskIds),
        supabase.from('users').select('id, name, email').in('id', [...new Set(tasks.map(t => t.agent_id).filter(Boolean))]),
      ]);

      const appCounts = {};
      (appResult.data || []).forEach(a => { appCounts[a.task_id] = (appCounts[a.task_id] || 0) + 1; });

      const viewCounts = {};
      (viewResult.data || []).forEach(v => { viewCounts[v.target_id] = (viewCounts[v.target_id] || 0) + 1; });

      const agentMap = {};
      (agentResult.data || []).forEach(a => { agentMap[a.id] = { name: a.name, email: a.email }; });

      const enriched = tasks.map(t => ({
        ...t,
        applicant_count: appCounts[t.id] || 0,
        view_count: viewCounts[t.id] || 0,
        agent_name: agentMap[t.agent_id]?.name || 'Unknown',
        agent_email: agentMap[t.agent_id]?.email || '',
        spots_filled: Array.isArray(t.human_ids) ? t.human_ids.length : 0,
      }));

      res.json({ tasks: enriched, total: total || 0, page, limit });
    } catch (error) {
      logger.error({ err: error }, 'Task search endpoint error');
      captureException(error, { tags: { admin_action: 'tasks_search' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // POST /tasks/:id/moderate — Admin moderation action
  // ============================================================
  router.post('/tasks/:id/moderate', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;

      const VALID_ACTIONS = ['hide', 'remove', 'unflag'];
      if (!VALID_ACTIONS.includes(action)) {
        return res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` });
      }

      // Fetch the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const now = new Date().toISOString();
      let updateData = {};
      let notifTitle = '';
      let notifMessage = '';

      if (action === 'hide') {
        updateData = { moderation_status: 'hidden', hidden_at: now, hidden_reason: notes || 'Hidden by admin' };
        notifTitle = 'Task Hidden';
        notifMessage = `Your task "${task.title}" has been hidden by a moderator.`;
      } else if (action === 'remove') {
        updateData = { moderation_status: 'removed', hidden_at: now, hidden_reason: notes || 'Removed by admin' };
        // Only cancel if the task status allows it
        const cancellableStatuses = ['open', 'pending_acceptance', 'assigned', 'in_progress', 'pending_review', 'rejected'];
        if (cancellableStatuses.includes(task.status)) {
          updateData.status = 'cancelled';
        }
        notifTitle = 'Task Removed';
        notifMessage = `Your task "${task.title}" has been removed by a moderator.`;
      } else if (action === 'unflag') {
        updateData = { moderation_status: 'clean', hidden_at: null, hidden_reason: null };
        notifTitle = 'Task Restored';
        notifMessage = `Your task "${task.title}" has been restored by a moderator.`;
      }

      // Update task
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify task creator
      if (task.agent_id) {
        try {
          await createNotification(task.agent_id, 'moderation_action', notifTitle, notifMessage, `/tasks/${id}`);
        } catch (notifErr) {
          logger.error({ err: notifErr }, 'Failed to create moderation notification');
        }
      }

      // Audit log
      await logAdminAction(req.user.id, `moderate_task_${action}`, id, null, { action, notes });

      res.json({ success: true, task_id: id, action, moderation_status: updateData.moderation_status });
    } catch (error) {
      logger.error({ err: error }, 'Task moderation endpoint error');
      captureException(error, { tags: { admin_action: 'moderate_task' } });
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

      // Atomic task update — include escrow_status precondition to prevent double-release
      const { data: updatedTask, error: updateTaskError } = await supabase
        .from('tasks')
        .update({
          escrow_status: 'released',
          escrow_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('escrow_status', 'deposited')
        .select('id')
        .single();

      if (updateTaskError || !updatedTask) {
        return res.status(409).json({ error: 'Task escrow status has already changed' });
      }

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
        deposit_amount: payment.deposit_amount,
        worker_amount: parseFloat(humanAmount),
        platform_fee: parseFloat(platformFee),
        worker_stripe_account: task.human?.stripe_account_id || null,
        message: 'Payment released. Ready for withdrawal confirmation.'
      });
    } catch (error) {
      logger.error({ err: error }, 'Release payment error');
      captureException(error, { tags: { admin_action: 'release_payment' } });
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
      logger.error({ err: error }, 'Refund error');
      captureException(error, { tags: { admin_action: 'refund' } });
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
          .select('*')
          .eq('id', report.task_id)
          .single();

        let agent = null;
        if (task?.agent_id) {
          const { data: agentData } = await supabase
            .from('users')
            .select('*')
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
        .select('*')
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
      logger.error({ err: error }, 'Resolve report error');
      captureException(error, { tags: { admin_action: 'resolve_report' } });
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

  // ============================================================================
  // GET /api/admin/flagged-tasks - List tasks pending content review
  // ============================================================================
  router.get('/flagged-tasks', async (req, res) => {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, description, task_type_id, status, created_at, poster_id, location_zone')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch validation log entries for these tasks to show policy_flags
      const taskIds = (tasks || []).map(t => t.id);
      let validationLogs = [];
      if (taskIds.length > 0) {
        const { data: logs } = await supabase
          .from('task_validation_log')
          .select('id, task_type_id, validation_result, errors, policy_flags, created_at')
          .in('payload_hash', taskIds.map(id => id)) // payload_hash won't match task id
          .eq('validation_result', 'flagged_for_review')
          .order('created_at', { ascending: false });
        validationLogs = logs || [];
      }

      // Also look up logs by agent_id association — more reliable approach
      // For flagged tasks, fetch the most recent flagged log per task_type_id
      const { data: flaggedLogs } = await supabase
        .from('task_validation_log')
        .select('*')
        .eq('validation_result', 'flagged_for_review')
        .order('created_at', { ascending: false })
        .limit(100);

      await logAdminAction(req.user.id, 'view_flagged_tasks', null, null, { count: (tasks || []).length });

      res.json({
        tasks: tasks || [],
        validation_logs: flaggedLogs || [],
        count: (tasks || []).length,
      });
    } catch (error) {
      console.error('[Admin] Flagged tasks fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/review-task/:id - Approve or reject a flagged task
  // ============================================================================
  router.post('/review-task/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { decision, reason } = req.body;

      if (!decision || !['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
      }

      // Verify task exists and is pending_review
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('id, status, title')
        .eq('id', id)
        .single();

      if (fetchError || !task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.status !== 'pending_review') {
        return res.status(400).json({
          error: `Task is not pending review (current status: ${task.status})`,
        });
      }

      const newStatus = decision === 'approve' ? 'open' : 'rejected';
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await logAdminAction(req.user.id, `review_task_${decision}`, id, null, { reason, previous_status: 'pending_review', new_status: newStatus });

      res.json({
        success: true,
        task_id: id,
        decision,
        new_status: newStatus,
      });
    } catch (error) {
      console.error('[Admin] Review task error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POST /api/admin/flush-task-type-cache - Bust the task type registry cache
  // ============================================================================
  router.post('/flush-task-type-cache', async (req, res) => {
    try {
      const { flushTaskTypeCache } = require('../lib/validation/pipeline');
      flushTaskTypeCache();

      await logAdminAction(req.user.id, 'flush_task_type_cache', null, null, {});

      res.json({ success: true, message: 'Task type cache flushed' });
    } catch (error) {
      console.error('[Admin] Cache flush error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // BUSINESS INTELLIGENCE ENDPOINTS
  // ============================================================================

  /**
   * Helper: parse period query param into a Date cutoff
   * Supports: 7d, 30d, 90d, all (default: 30d)
   */
  function getPeriodCutoff(period) {
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    if (period === 'all' || !days[period]) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days[period] || 30));
    return cutoff.toISOString();
  }

  // ============================================================================
  // GET /api/admin/financials — Financial overview with period filtering
  // ============================================================================
  router.get('/financials', async (req, res) => {
    try {
      const period = req.query.period || '30d';
      const cutoff = getPeriodCutoff(period);

      // --- GMV: sum of budget_cents for tasks that reached assigned or beyond ---
      let gmvQuery = supabase
        .from('tasks')
        .select('budget_cents')
        .not('status', 'in', '("open","cancelled")');
      if (cutoff) gmvQuery = gmvQuery.gte('created_at', cutoff);
      const { data: gmvTasks } = await gmvQuery;
      const gmvTotalCents = (gmvTasks || []).reduce((sum, t) => sum + (t.budget_cents || 0), 0);

      // --- Platform fees: sum of platform_fee_cents on completed/paid tasks ---
      let feesQuery = supabase
        .from('tasks')
        .select('platform_fee_cents')
        .in('status', ['completed', 'paid']);
      if (cutoff) feesQuery = feesQuery.gte('created_at', cutoff);
      const { data: feeTasks } = await feesQuery;
      const feesTotalCents = (feeTasks || []).reduce((sum, t) => sum + (t.platform_fee_cents || 0), 0);

      // --- Payouts: sum of amount_cents ---
      let payoutsQuery = supabase.from('payouts').select('amount_cents');
      if (cutoff) payoutsQuery = payoutsQuery.gte('created_at', cutoff);
      const { data: payoutRows } = await payoutsQuery;
      const payoutsTotalCents = (payoutRows || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);

      // --- Outstanding escrow: pending_transactions with status 'pending' ---
      let escrowQuery = supabase
        .from('pending_transactions')
        .select('amount_cents')
        .eq('status', 'pending');
      const { data: escrowRows } = await escrowQuery;
      const escrowTotalCents = (escrowRows || []).reduce((sum, e) => sum + (e.amount_cents || 0), 0);

      // --- Refunds: manual_payments with refund status ---
      let refundsQuery = supabase
        .from('manual_payments')
        .select('deposit_amount')
        .eq('status', 'refunded');
      if (cutoff) refundsQuery = refundsQuery.gte('refunded_at', cutoff);
      const { data: refundRows } = await refundsQuery;
      const refundsTotalCents = (refundRows || []).reduce((sum, r) => sum + Math.round((parseFloat(r.deposit_amount) || 0) * 100), 0);

      // --- Disputes ---
      let disputesOpenQuery = supabase.from('disputes').select('id', { count: 'exact' }).eq('status', 'open');
      let disputesResolvedQuery = supabase.from('disputes').select('id', { count: 'exact' }).eq('status', 'resolved');
      if (cutoff) {
        disputesOpenQuery = disputesOpenQuery.gte('created_at', cutoff);
        disputesResolvedQuery = disputesResolvedQuery.gte('created_at', cutoff);
      }
      const [{ count: openDisputes }, { count: resolvedDisputes }] = await Promise.all([
        disputesOpenQuery,
        disputesResolvedQuery,
      ]);

      // --- Premium / subscriptions ---
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('status', 'active');

      const byTier = {};
      let mrrCents = 0;
      const tierPrices = { builder: 1000, pro: 3000 }; // monthly prices in cents
      for (const sub of (activeSubs || [])) {
        byTier[sub.tier] = (byTier[sub.tier] || 0) + 1;
        mrrCents += tierPrices[sub.tier] || 0;
      }

      res.json({
        period,
        gmv: { total_cents: gmvTotalCents, count: (gmvTasks || []).length },
        platform_fees: { total_cents: feesTotalCents, count: (feeTasks || []).length },
        payouts: { total_cents: payoutsTotalCents, count: (payoutRows || []).length },
        outstanding_escrow: { total_cents: escrowTotalCents, count: (escrowRows || []).length },
        refunds: { total_cents: refundsTotalCents, count: (refundRows || []).length },
        disputes: {
          open: openDisputes || 0,
          resolved: resolvedDisputes || 0,
          total_amount_cents: 0, // Not tracked at dispute level
        },
        premium_revenue: {
          mrr_cents: mrrCents,
          active_subscribers: (activeSubs || []).length,
          by_tier: byTier,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Financials endpoint error');
      captureException(error, { tags: { admin_action: 'financials' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/growth — User and task growth metrics
  // ============================================================================
  router.get('/growth', async (req, res) => {
    try {
      const period = req.query.period || '30d';
      const cutoff = getPeriodCutoff(period);

      // --- Total users by type ---
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, type, created_at, last_active_at');

      const totalUsers = (allUsers || []).length;
      const humans = (allUsers || []).filter(u => u.type === 'human').length;
      const agents = (allUsers || []).filter(u => u.type === 'agent').length;

      // New users this period
      const periodUsers = cutoff
        ? (allUsers || []).filter(u => u.created_at >= cutoff)
        : allUsers || [];

      // Signups by day
      const signupsByDay = {};
      for (const u of periodUsers) {
        const day = u.created_at?.substring(0, 10);
        if (!day) continue;
        if (!signupsByDay[day]) signupsByDay[day] = { date: day, humans: 0, agents: 0 };
        if (u.type === 'human') signupsByDay[day].humans++;
        else if (u.type === 'agent') signupsByDay[day].agents++;
      }

      // Active users (based on last_active_at)
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const dailyActive = (allUsers || []).filter(u => u.last_active_at && (now - new Date(u.last_active_at).getTime()) < dayMs).length;
      const weeklyActive = (allUsers || []).filter(u => u.last_active_at && (now - new Date(u.last_active_at).getTime()) < 7 * dayMs).length;
      const monthlyActive = (allUsers || []).filter(u => u.last_active_at && (now - new Date(u.last_active_at).getTime()) < 30 * dayMs).length;

      // --- Tasks ---
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, status, created_at');

      const totalTasks = (allTasks || []).length;
      const byStatus = {};
      for (const t of (allTasks || [])) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      }

      const periodTasks = cutoff
        ? (allTasks || []).filter(t => t.created_at >= cutoff)
        : allTasks || [];
      const completedThisPeriod = periodTasks.filter(t => ['completed', 'paid'].includes(t.status)).length;

      // Tasks created by day
      const createdByDay = {};
      for (const t of periodTasks) {
        const day = t.created_at?.substring(0, 10);
        if (!day) continue;
        createdByDay[day] = (createdByDay[day] || 0) + 1;
      }

      res.json({
        period,
        users: {
          total: totalUsers,
          humans,
          agents,
          new_this_period: periodUsers.length,
          signups_by_day: Object.values(signupsByDay).sort((a, b) => a.date.localeCompare(b.date)),
        },
        tasks: {
          total: totalTasks,
          by_status: byStatus,
          created_this_period: periodTasks.length,
          completed_this_period: completedThisPeriod,
          created_by_day: Object.entries(createdByDay)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        },
        active_users: {
          daily: dailyActive,
          weekly: weeklyActive,
          monthly: monthlyActive,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Growth endpoint error');
      captureException(error, { tags: { admin_action: 'growth' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GET /api/admin/funnel — Conversion funnel metrics
  // ============================================================================
  router.get('/funnel', async (req, res) => {
    try {
      const period = req.query.period || '30d';
      const cutoff = getPeriodCutoff(period);

      // Fetch all tasks with lifecycle timestamps
      let tasksQuery = supabase
        .from('tasks')
        .select('id, status, created_at, assigned_at, work_started_at, proof_submitted_at');
      if (cutoff) tasksQuery = tasksQuery.gte('created_at', cutoff);
      const { data: tasks } = await tasksQuery;
      const allTasks = tasks || [];

      // Fetch applications to know which tasks got applications
      let appsQuery = supabase.from('task_applications').select('task_id');
      if (cutoff) appsQuery = appsQuery.gte('created_at', cutoff);
      const { data: apps } = await appsQuery;
      const tasksWithApps = new Set((apps || []).map(a => a.task_id));

      // Funnel counts
      const tasksCreated = allTasks.length;
      const tasksWithApplications = allTasks.filter(t => tasksWithApps.has(t.id)).length;
      const tasksAssigned = allTasks.filter(t => t.assigned_at || ['assigned', 'in_progress', 'pending_review', 'completed', 'paid', 'rejected', 'disputed'].includes(t.status)).length;
      const tasksStarted = allTasks.filter(t => t.work_started_at || ['in_progress', 'pending_review', 'completed', 'paid', 'rejected', 'disputed'].includes(t.status)).length;
      const tasksCompleted = allTasks.filter(t => ['pending_review', 'completed', 'paid'].includes(t.status)).length;
      const tasksApproved = allTasks.filter(t => ['completed', 'paid'].includes(t.status)).length;
      const tasksPaid = allTasks.filter(t => t.status === 'paid').length;

      // Conversion rates
      const pct = (num, den) => den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '0%';

      // Average times (hours)
      const avgHours = (field, tasks) => {
        const diffs = tasks
          .filter(t => t[field] && t.created_at)
          .map(t => (new Date(t[field]).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60));
        return diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;
      };

      // Time to first application (use assigned_at - created_at as proxy since we don't have first_application_at)
      const timeToAssigned = (() => {
        const diffs = allTasks
          .filter(t => t.assigned_at)
          .map(t => (new Date(t.assigned_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60));
        return diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;
      })();

      const timeAssignedToStarted = (() => {
        const diffs = allTasks
          .filter(t => t.assigned_at && t.work_started_at)
          .map(t => (new Date(t.work_started_at).getTime() - new Date(t.assigned_at).getTime()) / (1000 * 60 * 60));
        return diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;
      })();

      const timeStartedToCompleted = (() => {
        const diffs = allTasks
          .filter(t => t.work_started_at && t.proof_submitted_at)
          .map(t => (new Date(t.proof_submitted_at).getTime() - new Date(t.work_started_at).getTime()) / (1000 * 60 * 60));
        return diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0;
      })();

      res.json({
        period,
        funnel: {
          tasks_created: tasksCreated,
          tasks_with_applications: tasksWithApplications,
          tasks_assigned: tasksAssigned,
          tasks_started: tasksStarted,
          tasks_completed: tasksCompleted,
          tasks_approved: tasksApproved,
          tasks_paid: tasksPaid,
        },
        conversion_rates: {
          created_to_applied: pct(tasksWithApplications, tasksCreated),
          applied_to_assigned: pct(tasksAssigned, tasksWithApplications),
          assigned_to_started: pct(tasksStarted, tasksAssigned),
          started_to_completed: pct(tasksCompleted, tasksStarted),
          completed_to_paid: pct(tasksPaid, tasksCompleted),
          overall: pct(tasksPaid, tasksCreated),
        },
        avg_times: {
          created_to_first_application_hours: timeToAssigned, // proxy: uses assigned_at
          assigned_to_started_hours: timeAssignedToStarted,
          started_to_completed_hours: timeStartedToCompleted,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Funnel endpoint error');
      captureException(error, { tags: { admin_action: 'funnel' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // GET /api/admin/users/search — Paginated, filterable user list
  // ============================================================
  router.get('/users/search', async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 25, 100);
      const offset = (page - 1) * limit;
      const q = (req.query.q || '').trim();
      const type = req.query.type || null;
      const moderation = req.query.moderation || null;
      const sort = req.query.sort || 'newest';

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Text search (name or email)
      if (q) {
        const sanitized = q.replace(/[%_,.()'"]/g, '');
        if (sanitized) {
          query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
        }
      }

      // Filters
      if (type && type !== 'all') query = query.eq('type', type);
      if (moderation && moderation !== 'all') query = query.eq('moderation_status', moderation);

      // Sort
      const sortMap = {
        newest: { column: 'created_at', ascending: false },
        oldest: { column: 'created_at', ascending: true },
        most_active: { column: 'last_active_at', ascending: false },
        highest_rated: { column: 'rating', ascending: false },
      };
      const { column, ascending } = sortMap[sort] || sortMap.newest;
      query = query.order(column, { ascending, nullsFirst: false });

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data: users, error: usersError, count: total } = await query;
      if (usersError) throw usersError;
      if (!users || users.length === 0) return res.json({ users: [], total: 0, page, limit });

      // Enrich with task_count (batch)
      const userIds = users.map(u => u.id);
      const [agentTasksResult, humanTasksResult] = await Promise.all([
        supabase.from('tasks').select('agent_id').in('agent_id', userIds),
        supabase.from('tasks').select('human_id').in('human_id', userIds),
      ]);

      const agentTaskCounts = {};
      (agentTasksResult.data || []).forEach(t => {
        agentTaskCounts[t.agent_id] = (agentTaskCounts[t.agent_id] || 0) + 1;
      });
      const humanTaskCounts = {};
      (humanTasksResult.data || []).forEach(t => {
        humanTaskCounts[t.human_id] = (humanTaskCounts[t.human_id] || 0) + 1;
      });

      const enriched = users.map(u => {
        const { password_hash, ...safe } = u;
        return {
          ...safe,
          task_count: u.type === 'agent'
            ? (agentTaskCounts[u.id] || 0)
            : (humanTaskCounts[u.id] || 0),
        };
      });

      res.json({ users: enriched, total: total || 0, page, limit });
    } catch (error) {
      logger.error({ err: error }, 'Users search endpoint error');
      captureException(error, { tags: { admin_action: 'users_search' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // GET /api/admin/users/:id — Full user detail with activity
  // ============================================================
  router.get('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Full user record
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Strip password
      delete user.password_hash;

      // Recent tasks (posted if agent, assigned if human)
      const taskQuery = user.type === 'agent'
        ? supabase.from('tasks').select('id, title, status, budget, created_at, human_id, escrow_status').eq('agent_id', id)
        : supabase.from('tasks').select('id, title, status, budget, created_at, agent_id, escrow_status').eq('human_id', id);

      const [tasksResult, ratingsResult, reportsResult] = await Promise.all([
        taskQuery.order('created_at', { ascending: false }).limit(10),
        supabase.from('ratings')
          .select('id, task_id, rater_id, rating_score, comment, created_at')
          .eq('ratee_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        user.type === 'agent'
          ? supabase.from('task_reports')
              .select('id, task_id, reporter_id, reason, description, status, created_at')
              .in('task_id', (await supabase.from('tasks').select('id').eq('agent_id', id).limit(100)).data?.map(t => t.id) || [])
              .order('created_at', { ascending: false })
              .limit(10)
          : supabase.from('task_reports')
              .select('id, task_id, reporter_id, reason, description, status, created_at')
              .eq('reporter_id', id)
              .order('created_at', { ascending: false })
              .limit(10),
      ]);

      await logAdminAction(req.user.id, 'view_user_detail', null, null, { user_id: id });

      res.json({
        user,
        recent_tasks: tasksResult.data || [],
        recent_ratings: ratingsResult.data || [],
        report_history: reportsResult.data || [],
      });
    } catch (error) {
      logger.error({ err: error }, 'User detail endpoint error');
      captureException(error, { tags: { admin_action: 'user_detail' } });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // POST /api/admin/users/:id/moderate — Admin moderation action
  // ============================================================
  router.post('/users/:id/moderate', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes, suspension_days } = req.body;

      const VALID_ACTIONS = ['warn', 'suspend', 'ban', 'restore'];
      if (!action || !VALID_ACTIONS.includes(action)) {
        return res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` });
      }

      // Prevent self-moderation
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot moderate yourself' });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError || !user) {
        logger.error({ err: userError, userId: id }, 'User lookup failed in moderation');
        return res.status(404).json({ error: 'User not found' });
      }

      const now = new Date().toISOString();
      const updates = { updated_at: now };
      let notifTitle = '';
      let notifMessage = '';

      switch (action) {
        case 'warn':
          updates.warning_count = (user.warning_count || 0) + 1;
          updates.moderation_status = 'warned';
          notifTitle = 'Account Warning';
          notifMessage = `A warning has been issued on your account.${notes ? ' Reason: ' + notes : ' Please review our community guidelines.'}`;
          break;

        case 'suspend': {
          const days = Math.min(365, Math.max(1, parseInt(suspension_days) || 7));
          const suspendUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          updates.moderation_status = 'suspended';
          updates.suspended_until = suspendUntil.toISOString();
          notifTitle = 'Account Suspended';
          notifMessage = `Your account has been suspended until ${suspendUntil.toLocaleDateString()}.${notes ? ' Reason: ' + notes : ''}`;
          break;
        }

        case 'ban':
          updates.moderation_status = 'banned';
          notifTitle = 'Account Banned';
          notifMessage = `Your account has been permanently banned.${notes ? ' Reason: ' + notes : ''}`;
          break;

        case 'restore':
          updates.moderation_status = 'good_standing';
          updates.suspended_until = null;
          notifTitle = 'Account Restored';
          notifMessage = 'Your account has been restored to good standing.';
          break;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify user
      try {
        await createNotification(id, 'moderation_action', notifTitle, notifMessage, '/dashboard');
      } catch (notifErr) {
        logger.error({ err: notifErr }, 'Failed to create user moderation notification');
      }

      // Audit log
      await logAdminAction(req.user.id, `moderate_user_${action}`, null, null, {
        user_id: id,
        action,
        notes,
        suspension_days,
        previous_status: user.moderation_status,
      });

      res.json({
        success: true,
        user_id: id,
        action,
        new_moderation_status: updates.moderation_status,
      });
    } catch (error) {
      logger.error({ err: error }, 'User moderation endpoint error');
      captureException(error, { tags: { admin_action: 'moderate_user' } });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = initAdminRoutes;
