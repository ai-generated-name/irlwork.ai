import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get dashboard stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const userId = decoded.id;
    const role = decoded.role;
    
    let stats = {};
    
    if (role === 'human') {
      // Stats for humans
      const { count: assignedTasks } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', userId)
        .eq('status', 'in_progress');
      
      const { count: completedTasks } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', userId)
        .eq('status', 'completed');
      
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      const { data: user } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', userId)
        .single();
      
      stats = {
        assignedTasks: assignedTasks || 0,
        completedTasks: completedTasks || 0,
        pendingProof: 0,
        walletBalance: wallet?.balance || 0,
        isVerified: user?.is_verified || false
      };
    } else {
      // Stats for agents
      const { count: createdJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId);
      
      stats = {
        createdJobs: createdJobs || 0,
        pendingVerifications: 0,
        totalSpent: 0,
        activeWorkers: 0
      };
    }
    
    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get my tasks (for humans)
router.get('/my-tasks', authenticate, async (req, res) => {
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
      .eq('worker_id', decoded.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    res.json({ tasks: jobs || [] });
  } catch (error) {
    console.error('My tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get available jobs (for humans to browse)
router.get('/available-jobs', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    // Check if user is verified
    const { data: user } = await supabase
      .from('users')
      .select('is_verified')
      .eq('id', decoded.id)
      .single();
    
    if (!user?.is_verified) {
      return res.status(403).json({ error: 'Verification required', message: 'Verify your identity first' });
    }
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    res.json({ jobs: jobs || [] });
  } catch (error) {
    console.error('Available jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get wallet info
router.get('/wallet', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', decoded.id)
      .single();
    
    if (error) throw error;
    
    res.json({ wallet });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (error) throw error;
    
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
