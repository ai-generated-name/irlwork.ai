// irlwork.ai - API Server with Supabase + Payments
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');

// Configuration
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Configuration
const PLATFORM_FEE_PERCENT = 10;
const USDC_DECIMALS = 6;

// Data categories
const QUICK_CATEGORIES = [
  'delivery', 'pickup', 'errands', 'dog_walking', 'pet_sitting',
  'cleaning', 'moving', 'assembly', 'wait_line', 'stand_billboard',
  'event_staff', 'tech_setup', 'grocery', 'photography', 'general'
];

// ============ HELPERS ============
async function getUserByToken(token) {
  if (!token || !supabase) return null;
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', token)
    .single();
  
  if (data) return data;
  
  // Check API key
  const { data: apiUser } = await supabase
    .from('users')
    .select('*')
    .eq('api_key', token)
    .single();
  
  return apiUser;
}

async function createNotification(userId, type, title, message, link = null) {
  if (!supabase) return;
  await supabase.from('notifications').insert({
    id: uuidv4(),
    user_id: userId,
    type,
    title,
    message,
    link
  });
}

// ============ AUTH ============
app.post('/api/auth/register/human', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  try {
    const { email, password, name, city, state, hourly_rate, categories = [], bio = '', phone = '' } = req.body;
    
    if (!email || !name || !city) {
      return res.status(400).json({ error: 'Name, email, and city are required' });
    }
    
    const id = uuidv4();
    const password_hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
    const profile_completeness = 0.2 + (hourly_rate ? 0.1 : 0) + (categories.length > 0 ? 0.2 : 0) + (bio ? 0.1 : 0) + (phone ? 0.1 : 0);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        password_hash,
        name,
        type: 'human',
        bio,
        hourly_rate: hourly_rate || 25,
        account_type: 'human',
        city,
        state,
        service_radius: 25,
        skills: JSON.stringify(categories),
        profile_completeness,
        availability: 'available',
        rating: 0,
        jobs_completed: 0,
        verified: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate key')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }
    
    // Insert categories
    if (categories.length > 0) {
      const categoryRows = categories.map(cat => ({
        id: uuidv4(),
        human_id: id,
        category_id: cat,
        is_professional: 0
      }));
      await supabase.from('user_categories').insert(categoryRows);
    }
    
    res.json({ 
      user: { id, email, name, type: 'human', city, hourly_rate: hourly_rate || 25, categories }, 
      token: crypto.randomBytes(32).toString('hex')
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/register/agent', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  try {
    const { email, name, organization } = req.body;
    const id = uuidv4();
    const api_key = 'irl_' + crypto.randomBytes(24).toString('hex');
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        password_hash: null,
        name,
        type: 'agent',
        api_key,
        organization,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ user: { id, email, name, type: 'agent' }, api_key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { email, password } = req.body;
  const password_hash = crypto.createHash('sha256').update(password).digest('hex');
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password_hash)
    .single();
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    user: { id: user.id, email: user.email, name: user.name, type: user.type }, 
    token: crypto.randomBytes(32).toString('hex') 
  });
});

// ============ GOOGLE OAUTH ============
// Redirect to Supabase Google OAuth
app.get('/api/auth/google', (req, res) => {
  if (!supabaseUrl) return res.status(500).json({ error: 'Supabase not configured' });
  
  const redirectTo = req.query.redirect || 'http://localhost:5173';
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  res.redirect(authUrl);
});

// Google OAuth callback - Supabase redirects here after auth
app.get('/api/auth/google/callback', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  try {
    const { access_token, error } = req.query;
    
    if (error) {
      return res.redirect(`${req.query.redirect_to || 'http://localhost:5173'}?error=${encodeURIComponent(error)}`);
    }
    
    if (!access_token) {
      return res.redirect(`${req.query.redirect_to || 'http://localhost:5173'}?error=no_token`);
    }
    
    // Get user info from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    
    if (userError || !user) {
      return res.redirect(`${req.query.redirect_to || 'http://localhost:5173'}?error=auth_failed`);
    }
    
    const email = user.email;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
    
    // Check if user exists
    let { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }
    
    if (!existingUser) {
      // Create new user
      const id = uuidv4();
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id,
          email,
          name,
          type: 'human',
          account_type: 'human',
          verified: true,
          profile_completeness: 0.5,
          availability: 'available',
          rating: 0,
          jobs_completed: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      existingUser = newUser;
    }
    
    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Redirect back to app with token
    res.redirect(`${req.query.redirect_to || 'http://localhost:5173'}?token=${token}&user_id=${existingUser.id}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  } catch (e) {
    res.redirect(`${req.query.redirect_to || 'http://localhost:5173'}?error=${encodeURIComponent(e.message)}`);
  }
});

app.get('/api/auth/verify', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  
  res.json({ 
    user: { 
      id: user.id, email: user.email, name: user.name, type: user.type,
      city: user.city, hourly_rate: user.hourly_rate, 
      wallet_address: user.wallet_address,
      deposit_address: user.deposit_address,
      skills: JSON.parse(user.skills || '[]'),
      profile_completeness: user.profile_completeness
    } 
  });
});

// ============ HUMANS ============
app.get('/api/humans', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, min_rate, max_rate } = req.query;
  
  let query = supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, skills, rating, jobs_completed, wallet_address')
    .eq('type', 'human')
    .eq('verified', true);
  
  if (category) query = query.like('skills', `%${category}%`);
  if (city) query = query.like('city', `%${city}%`);
  if (min_rate) query = query.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) query = query.lte('hourly_rate', parseFloat(max_rate));
  
  const { data: humans, error } = await query.order('rating', { ascending: false }).limit(100);
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(humans?.map(h => ({ ...h, skills: JSON.parse(h.skills || '[]') })) || []);
});

app.get('/api/humans/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, profile_completeness, wallet_address')
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();
  
  if (error || !user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user, skills: JSON.parse(user.skills || '[]') });
});

// ============ PROFILE ============
app.put('/api/humans/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { wallet_address, hourly_rate, bio, categories } = req.body;
  
  const updates = { updated_at: new Date().toISOString() };
  
  if (wallet_address) updates.wallet_address = wallet_address;
  if (hourly_rate) updates.hourly_rate = hourly_rate;
  if (bio) updates.bio = bio;
  if (categories) updates.skills = JSON.stringify(categories);
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ success: true, user: data });
});

// ============ TASKS ============
app.get('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, urgent, status, my_tasks } = req.query;
  const user = await getUserByToken(req.headers.authorization);
  
  let query = supabase.from('tasks').select('*');
  
  if (category) query = query.eq('category', category);
  if (city) query = query.like('location', `%${city}%`);
  if (urgency) query = query.eq('urgency', urgency);
  if (status) query = query.eq('status', status);
  if (my_tasks && user) query = query.eq('agent_id', user.id);
  
  const { data: tasks, error } = await query.order('created_at', { ascending: false }).limit(100);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

app.post('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') return res.status(401).json({ error: 'Agents only' });
  
  const { title, description, category, location, budget_type, budget_min, budget_max, duration_hours, urgency, insurance_option, budget } = req.body;
  
  const id = uuidv4();
  const budgetAmount = budget || budget_max || budget_min || 50;
  
  // Generate unique deposit amount (budget + random cents)
  const randomCents = (Math.random() * 99 + 1) / 100;
  const uniqueDepositAmount = Math.round((budgetAmount + randomCents) * 100) / 100;
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      id,
      agent_id: user.id,
      human_id: null,
      title,
      description,
      category,
      location,
      budget_type: budget_type || 'hourly',
      budget_min,
      budget_max,
      budget: budgetAmount,
      duration_hours,
      urgency: urgency || 'scheduled',
      insurance_option,
      status: 'open',
      escrow_status: 'pending',
      escrow_amount: budgetAmount,
      unique_deposit_amount: uniqueDepositAmount,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Return task with deposit instructions
  res.json({ 
    ...task, 
    deposit_instructions: {
      platform_wallet: process.env.PLATFORM_WALLET_ADDRESS,
      amount: uniqueDepositAmount,
      currency: 'USDC',
      network: 'base',
      deadline: '24h'
    }
  });
});

app.get('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error || !task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

app.get('/api/tasks/:id/status', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, status, escrow_status, escrow_amount, escrow_deposited_at, escrow_released_at')
    .eq('id', req.params.id)
    .single();
  
  if (error || !task) return res.status(404).json({ error: 'Not found' });
  
  res.json({
    task_id: task.id,
    task_status: task.status,
    escrow_status: task.escrow_status,
    escrow_amount: task.escrow_amount,
    escrow_deposited_at: task.escrow_deposited_at,
    escrow_released_at: task.escrow_released_at
  });
});

app.post('/api/tasks/:id/apply', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { cover_letter, proposed_rate } = req.body;
  
  const { data: existing } = await supabase
    .from('task_applications')
    .select('*')
    .eq('task_id', req.params.id)
    .eq('human_id', user.id)
    .single();
  
  if (existing) {
    return res.status(400).json({ error: 'Already applied' });
  }
  
  const id = uuidv4();
  const { data: application, error } = await supabase
    .from('task_applications')
    .insert({
      id,
      task_id: req.params.id,
      human_id: user.id,
      cover_letter: cover_letter || '',
      proposed_rate,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: application.id, status: 'pending' });
});

// ============ TRANSACTIONS ============
app.get('/api/transactions', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`agent_id.eq.${user.id},human_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(transactions || []);
});

app.get('/api/deposits', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: deposits, error } = await supabase
    .from('deposits')
    .select('*')
    .or(`agent_id.eq.${user.id},human_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(deposits || []);
});

app.get('/api/payouts', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: payouts, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('human_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(payouts || []);
});

// ============ MCP SERVER ============
app.post('/api/mcp', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const apiKey = req.headers.authorization || req.headers['x-api-key'];
  const user = await getUserByToken(apiKey);
  
  if (!user || user.type !== 'agent') {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  try {
    const { method, params = {} } = req.body;
    
    switch (method) {
      case 'list_humans': {
        let query = supabase
          .from('users')
          .select('id, name, city, hourly_rate, skills, rating, jobs_completed, wallet_address')
          .eq('type', 'human')
          .eq('verified', true)
          .eq('availability', 'available');
        
        if (params.category) query = query.like('skills', `%${params.category}%`);
        if (params.city) query = query.like('city', `%${params.city}%`);
        
        const { data: humans, error } = await query.limit(params.limit || 100);
        if (error) throw error;
        
        res.json(humans?.map(h => ({ ...h, skills: JSON.parse(h.skills || '[]') })) || []);
        break;
      }
      
      case 'get_human': {
        const { data: human, error } = await supabase
          .from('users')
          .select('*, certifications(*)')
          .eq('id', params.human_id)
          .single();
        
        if (error) {
          res.status(404).json({ error: 'Human not found' });
        } else {
          res.json({ ...human, skills: JSON.parse(human.skills || '[]') });
        }
        break;
      }
      
      case 'post_task': {
        const id = uuidv4();
        const budgetAmount = params.budget_max || params.budget_min || 50;
        const randomCents = (Math.random() * 99 + 1) / 100;
        const uniqueDepositAmount = Math.round((budgetAmount + randomCents) * 100) / 100;
        
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            id,
            agent_id: user.id,
            title: params.title,
            description: params.description,
            category: params.category,
            location: params.location,
            budget_type: params.budget_type || 'hourly',
            budget_min: params.budget_min,
            budget_max: params.budget_max,
            budget: budgetAmount,
            duration_hours: params.duration_hours,
            urgency: params.urgency || 'scheduled',
            status: 'open',
            escrow_status: 'pending',
            escrow_amount: budgetAmount,
            unique_deposit_amount: uniqueDepositAmount,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        
        res.json({ 
          id: task.id, 
          status: 'open',
          deposit_instructions: {
            platform_wallet: process.env.PLATFORM_WALLET_ADDRESS,
            amount: uniqueDepositAmount,
            currency: 'USDC',
            network: 'base'
          }
        });
        break;
      }
      
      case 'hire_human': {
        const { task_id, human_id } = params;
        
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ 
            human_id, 
            status: 'assigned',
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id);
        
        if (taskError) throw taskError;
        res.json({ success: true });
        break;
      }
      
      case 'get_task_status': {
        const { data: task, error } = await supabase
          .from('tasks')
          .select('id, status, escrow_status, escrow_amount, escrow_deposited_at')
          .eq('id', params.task_id)
          .single();
        
        if (error) throw error;
        res.json(task);
        break;
      }
      
      case 'release_payment': {
        const { task_id, human_id } = params;
        
        // Get task details
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();
        
        if (taskError || !task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        const escrowAmount = task.escrow_amount || task.budget || 50;
        
        // Calculate fees
        const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
        const netAmount = escrowAmount - platformFee;
        
        // Get human's wallet
        const { data: human, error: humanError } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('id', human_id)
          .single();
        
        if (humanError || !human?.wallet_address) {
          return res.status(400).json({ error: 'Human has no wallet address' });
        }
        
        // Initialize wallet and send payment (simulated if no wallet config)
        let txHash = null;
        if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
          try {
            const { sendUSDC } = require('./lib/wallet');
            await require('./lib/wallet').initWallet();
            txHash = await sendUSDC(human.wallet_address, netAmount);
          } catch (e) {
            console.error('Wallet error:', e.message);
          }
        } else {
          console.log(`[SIMULATED] Sending ${netAmount} USDC to ${human.wallet_address}`);
          txHash = '0x' + crypto.randomBytes(32).toString('hex');
        }
        
        // Update task escrow status
        await supabase
          .from('tasks')
          .update({
            escrow_status: 'released',
            escrow_released_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id);
        
        // Record payout
        await supabase.from('payouts').insert({
          id: uuidv4(),
          task_id,
          human_id,
          agent_id: user.id,
          gross_amount: escrowAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          wallet_address: human.wallet_address,
          tx_hash: txHash,
          status: 'completed',
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
        // Record transaction
        await supabase.from('transactions').insert({
          id: uuidv4(),
          task_id,
          agent_id: user.id,
          human_id,
          amount: escrowAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: 'released',
          release_tx: txHash,
          created_at: new Date().toISOString()
        });
        
        // Update human stats
        await supabase
          .from('users')
          .update({
            jobs_completed: supabase.raw('jobs_completed + 1'),
            updated_at: new Date().toISOString()
          })
          .eq('id', human_id);
        
        // Notify human
        await createNotification(
          human_id,
          'payment_released',
          'Payment Released!',
          `Your payment of ${netAmount.toFixed(2)} USDC has been sent to your wallet.`
        );
        
        res.json({ 
          success: true, 
          amount: escrowAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          tx_hash: txHash
        });
        break;
      }
      
      case 'get_tasks': {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(tasks || []);
        break;
      }
      
      default:
        res.status(400).json({ error: `Unknown method: ${method}` });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ NOTIFICATIONS ============
app.get('/api/notifications', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(notifications || []);
});

// ============ WALLET STATUS ============
app.get('/api/wallet/status', async (req, res) => {
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  let balance = 0;
  if (user.wallet_address && process.env.BASE_RPC_URL) {
    try {
      const { getBalance } = require('./lib/wallet');
      balance = await getBalance(user.wallet_address);
    } catch (e) {}
  }
  
  res.json({
    wallet_address: user.wallet_address,
    has_wallet: !!user.wallet_address,
    balance: balance,
    currency: 'USDC'
  });
});

// ============ HEALTH ============
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not_configured';
  if (supabase) {
    try {
      await supabase.from('users').select('id').limit(1);
      dbStatus = 'ok';
    } catch (e) {
      dbStatus = 'error';
    }
  }
  
  res.json({ 
    status: dbStatus === 'ok' ? 'ok' : 'degraded', 
    name: 'irlwork.ai', 
    db: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

// ============ START ============
async function start() {
  console.log('🚀 irlwork.ai API starting...');
  
  if (supabase) {
    console.log('✅ Supabase connected');
  } else {
    console.log('⚠️  Supabase not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)');
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   MCP: POST http://localhost:${PORT}/api/mcp`);
  });
}

start();
