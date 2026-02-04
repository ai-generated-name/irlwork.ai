import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// MCP Instructions
router.get('/instructions', async (req, res) => {
  res.json({
    name: "irlwork-ai",
    version: "1.0.0",
    description: "MCP server for AI agents to hire humans for physical tasks",
    instructions: `You are connected to the irlwork.ai MCP server. 

## Workflow
1. Create a task with create_task
2. Humans browse and accept tasks
3. Human submits proof when done
4. You verify and release_payment

## Task Types
- delivery, pickup, errand, assembly, standard`,
    tools: [
      { name: "create_task", description: "Create a new task" },
      { name: "get_tasks", description: "List your tasks" },
      { name: "get_humans", description: "List available humans" },
      { name: "release_payment", description: "Release payment" }
    ]
  });
});

// List agent's tasks
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('creator_id', decoded.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ tasks: jobs || [] });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// Get task status
router.get('/tasks/:taskId/status', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const { data: task, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.taskId)
      .single();
    
    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task });
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// Safe JSON parse
function safeParse(val: any) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// Get available humans
router.get('/humans', authenticate, async (req, res) => {
  try {
    const { data: humans, error } = await supabase
      .from('users')
      .select('id, name, bio, hourly_rate, skills')
      .eq('role', 'human')
      .eq('is_verified', true)
      .limit(50);
    
    if (error) throw error;
    
    const parsed = (humans || []).map(h => ({
      ...h,
      skills: safeParse(h.skills)
    }));
    
    res.json({ humans: parsed });
  } catch (error) {
    console.error('Get humans error:', error);
    res.status(500).json({ error: 'Failed to get humans' });
  }
});

// Release payment
router.post('/release_payment', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const { taskId } = req.body;
    
    // Get task
    const { data: task, error: taskError } = await supabase
      .from('jobs')
      .select('*, worker:users!worker_id(*)')
      .eq('id', taskId)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get worker wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', task.worker_id)
      .single();
    
    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Worker wallet not found' });
    }
    
    // Update wallet balance
    const newBalance = (wallet.balance || 0) + task.budget;
    await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);
    
    // Log transaction
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      amount: task.budget,
      type: 'payout',
      description: `Payment for task: ${task.title}`
    });
    
    res.json({ 
      message: 'Payment released',
      amount: task.budget,
      workerWallet: task.worker_id
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// Webhook for agents
router.post('/webhook', async (req, res) => {
  try {
    const { api_key, action, data } = req.body;
    
    // Validate API key
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('api_key', api_key)
      .single();
    
    if (userError || !user || user.role !== 'agent') {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    switch (action) {
      case 'create_task': {
        const { data: task, error } = await supabase
          .from('jobs')
          .insert({
            title: data.title,
            description: data.description,
            budget: parseFloat(data.budget),
            priority: data.priority || 'normal',
            category: data.category || 'standard',
            creator_id: user.id,
            status: 'open'
          })
          .select('id')
          .single();
        
        if (error) throw error;
        return res.json({ taskId: task.id });
      }
      
      case 'get_tasks': {
        const { data: tasks, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return res.json({ tasks: tasks || [] });
      }
      
      case 'get_humans': {
        const { data: humans, error } = await supabase
          .from('users')
          .select('id, name, hourly_rate, skills')
          .eq('role', 'human')
          .eq('is_verified', true);
        
        if (error) throw error;
        return res.json({ humans: humans || [] });
      }
      
      case 'verify': {
        const { task_id, approved } = data;
        
        // Get task and worker
        const { data: task, error } = await supabase
          .from('jobs')
          .select('*, worker:users!worker_id(*)')
          .eq('id', task_id)
          .single();
        
        if (error || !task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        // Update task status
        await supabase
          .from('jobs')
          .update({ status: approved ? 'completed' : 'in_progress' })
          .eq('id', task_id);
        
        // Release payment if approved
        if (approved && task.worker_id) {
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', task.worker_id)
            .single();
          
          if (!walletError && wallet) {
            const newBalance = (wallet.balance || 0) + task.budget;
            await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
          }
        }
        
        return res.json({ success: true });
      }
      
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

export default router;
