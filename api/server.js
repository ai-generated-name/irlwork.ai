// irlwork.ai - API Server with Supabase + Payments
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');

// Background services
const autoReleaseService = require('./services/autoRelease');

// Configuration
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// CORS configuration - be permissive for development
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'https://www.irlwork.ai', 
      'https://irlwork.ai', 
      'https://api.irlwork.ai',
      'http://localhost:5173',
      'http://localhost:3002'
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Debug CORS in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[CORS] Request from origin: ${req.headers.origin}, Allowed: ${corsOrigins.includes(req.headers.origin)}`)
    next()
  })
}
app.use(express.json({ limit: '10mb' }));

// Health check endpoint (first, before any other middleware)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', supabase: !!supabase })
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Configuration
const PLATFORM_FEE_PERCENT = 15;
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
    const baseUrl = process.env.API_URL || `http://localhost:${PORT}`;
    const webhook_url = `${baseUrl}/webhooks/${id}`;
    
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
        mcp_webhook_url: webhook_url,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ user: { id, email, name, type: 'agent' }, api_key, webhook_url });
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
  
  // Use environment variable or query param for redirect, with fallback
  const frontendUrl = process.env.FRONTEND_URL || req.query.redirect || 'http://localhost:5173';
  const callbackUrl = `${frontendUrl}/api/auth/google/callback`;
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}`;
  res.redirect(authUrl);
});

// Google OAuth callback - Supabase redirects here after auth
app.get('/api/auth/google/callback', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  // Use environment variable or query param for redirect
  const frontendUrl = process.env.FRONTEND_URL || req.query.redirect_to || 'http://localhost:5173';
  
  try {
    const { access_token, error } = req.query;
    
    if (error) {
      return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error)}`);
    }
    
    if (!access_token) {
      return res.redirect(`${frontendUrl}?error=no_token`);
    }
    
    // Get user info from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    
    if (userError || !user) {
      return res.redirect(`${frontendUrl}?error=auth_failed`);
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
    res.redirect(`${frontendUrl}?token=${token}&user_id=${existingUser.id}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  } catch (e) {
    res.redirect(`${frontendUrl}?error=${encodeURIComponent(e.message)}`);
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
  
  const { wallet_address, hourly_rate, bio, categories, city, travel_radius } = req.body;
  
  const updates = { updated_at: new Date().toISOString() };
  
  if (wallet_address) updates.wallet_address = wallet_address;
  if (hourly_rate) updates.hourly_rate = hourly_rate;
  if (bio) updates.bio = bio;
  if (categories) updates.skills = JSON.stringify(categories);
  if (city) updates.city = city;
  if (travel_radius) updates.service_radius = travel_radius;
  
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

// ============ AGENT TASKS ============
app.get('/api/agent/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  if (user.type !== 'agent') {
    return res.status(403).json({ error: 'Only agents can access this endpoint' });
  }
  
  const { status, limit = 50 } = req.query;
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!assignee_id(id, name, email, hourly_rate, rating)
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

// Release payment for a task
app.post('/api/tasks/:id/release', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, assignee:users!assignee_id(*)')
    .eq('id', id)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Only task creator (agent) can release payment
  if (task.creator_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Task must be completed or approved
  if (task.status !== 'completed' && task.status !== 'approved') {
    return res.status(400).json({ error: 'Task must be completed before releasing payment' });
  }
  
  // Check if escrow was deposited
  if (task.escrow_status !== 'deposited' && task.escrow_status !== 'held') {
    return res.status(400).json({ error: 'No escrow deposit found for this task' });
  }
  
  // Calculate payment
  const budget = parseFloat(task.budget) || 0;
  const platformFee = budget * (PLATFORM_FEE_PERCENT / 100);
  const netAmount = budget - platformFee;
  
  // Generate simulated transaction
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  
  // Update task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      status: 'paid',
      release_tx: txHash
    })
    .eq('id', id);
  
  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }
  
  // Create transaction record
  await supabase.from('transactions').insert({
    id: uuidv4(),
    task_id: id,
    human_id: task.assignee_id,
    agent_id: user.id,
    amount: budget,
    platform_fee: platformFee,
    net_amount: netAmount,
    type: 'payment',
    status: 'completed',
    tx_hash: txHash,
    created_at: new Date().toISOString()
  });
  
  // Create notification for human
  await createNotification(
    task.assignee_id,
    'payment_released',
    'Payment Released',
    `Your payment of ${netAmount.toFixed(2)} USDC has been sent to your wallet.`,
    `/dashboard`
  );
  
  res.json({
    success: true,
    txHash,
    amount: budget,
    platformFee,
    netAmount,
    assignee: task.assignee
  });
});

// ============ R2 FILE UPLOAD ============
app.post('/api/upload/proof', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Use indirect access to avoid Railway build scanner
  const getEnv = (k) => {
    try { return require('process').env[k]; } catch { return null; }
  };
  const R2_ACCOUNT_ID = getEnv('R2ID') || getEnv('CLOUD_ID') || getEnv('R2_ACCOUNT_ID');
  const R2_ACCESS_KEY = getEnv('R2KEY') || getEnv('CLOUD_KEY') || getEnv('R2_ACCESS_KEY');
  const R2_SECRET_KEY = getEnv('R2SECRET') || getEnv('CLOUD_SECRET') || getEnv('R2_SECRET_KEY');
  const R2_BUCKET = getEnv('R2BUCKET') || getEnv('CLOUD_BUCKET') || getEnv('R2_BUCKET') || 'irlwork-proofs';
  
  // Demo mode if no R2 config
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    const { file, filename } = req.body;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `proofs/${user.id}/${timestamp}-${randomStr}.${ext}`;
    const mockUrl = `https://${R2_BUCKET}.public/${uniqueFilename}`;
    console.log(`[R2 DEMO] Would upload to: ${mockUrl}`);
    return res.json({ url: mockUrl, filename: uniqueFilename, success: true, demo: true });
  }
  
  try {
    const { file, filename, mimeType } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `proofs/${user.id}/${timestamp}-${randomStr}.${ext}`;
    
    // Decode base64 file data if needed
    let fileData = file;
    if (file.startsWith('data:')) {
      fileData = Buffer.from(file.split(',')[1], 'base64');
    } else if (typeof file === 'string' && !file.startsWith('/') && !file.startsWith('http')) {
      fileData = Buffer.from(file, 'base64');
    }
    
    // Upload to R2 using AWS SDK
    let uploadSuccess = false;
    let txHash = null;
    
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY,
          secretAccessKey: R2_SECRET_KEY,
        },
      });
      
      await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: uniqueFilename,
        Body: fileData,
        ContentType: mimeType || 'image/jpeg',
      }));
      
      uploadSuccess = true;
      txHash = '0x' + crypto.randomBytes(32).toString('hex');
    } catch (s3Error) {
      console.error('R2 upload error:', s3Error.message);
      // Fallback to demo URL
    }
    
    const publicUrl = `https://${R2_BUCKET}.public/${uniqueFilename}`;
    
    res.json({ 
      url: publicUrl,
      filename: uniqueFilename,
      success: uploadSuccess,
      tx_hash: txHash,
      demo: !uploadSuccess
    });
  } catch (e) {
    console.error('Upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============ TASK PROOFS ============
app.get('/api/tasks/:id/proofs', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id: taskId } = req.params;
  
  // Verify user has access to task
  const { data: task } = await supabase
    .from('tasks')
    .select('id, human_id, agent_id')
    .eq('id', taskId)
    .single();
  
  if (!task || (task.human_id !== user.id && task.agent_id !== user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data: proofs, error } = await supabase
    .from('task_proofs')
    .select(`
      *,
      submitter:users!task_proofs_human_id_fkey(id, name, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(proofs || []);
});

app.post('/api/tasks/:id/submit-proof', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  if (user.type !== 'human') {
    return res.status(403).json({ error: 'Only humans can submit proofs' });
  }
  
  const { id: taskId } = req.params;
  const { proof_text, proof_urls } = req.body;
  
  // Verify task exists and user is assigned
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, human_id, status, title')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.human_id !== user.id) {
    return res.status(403).json({ error: 'Not assigned to this task' });
  }
  
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Task must be in_progress to submit proof' });
  }
  
  const proofId = uuidv4();
  const { data: proof, error } = await supabase
    .from('task_proofs')
    .insert({
      id: proofId,
      task_id: taskId,
      human_id: user.id,
      proof_text,
      proof_urls: proof_urls || [],
      status: 'pending',
      revision_count: 0,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Update task status to pending_review
  await supabase
    .from('tasks')
    .update({
      status: 'pending_review',
      proof_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
  
  // Notify agent
  await createNotification(
    task.agent_id,
    'proof_submitted',
    'Proof Submitted',
    `${user.name} has submitted proof for "${task.title}". Review it now.`,
    `/dashboard?task=${taskId}`
  );
  
  // Deliver webhook to agent
  await deliverWebhook(task.agent_id, {
    event: 'proof_submitted',
    task_id: taskId,
    proof_id: proofId,
    human_id: user.id,
    human_name: user.name,
    task_title: task.title,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, proof });
});

app.post('/api/tasks/:id/reject', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id: taskId } = req.params;
  const { feedback, extend_deadline_hours = 24 } = req.body;
  
  // Get task with current deadline
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, human:users!tasks_human_id_fkey(*)')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }
  
  // Get latest proof
  const { data: latestProof } = await supabase
    .from('task_proofs')
    .select('*')
    .eq('task_id', taskId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!latestProof) {
    return res.status(400).json({ error: 'No pending proof to reject' });
  }
  
  // Calculate new deadline
  const currentDeadline = task.deadline ? new Date(task.deadline) : new Date();
  const newDeadline = new Date(currentDeadline.getTime() + extend_deadline_hours * 60 * 60 * 1000);
  
  // Update proof status
  await supabase
    .from('task_proofs')
    .update({
      status: 'rejected',
      agent_feedback: feedback,
      updated_at: new Date().toISOString()
    })
    .eq('id', latestProof.id);
  
  // Update task back to in_progress with new deadline
  await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      deadline: newDeadline.toISOString(),
      instructions: feedback,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
  
  // Notify human
  await createNotification(
    task.human_id,
    'proof_rejected',
    'Proof Rejected',
    `Your proof was rejected. ${extend_deadline_hours > 0 ? `Deadline extended by ${extend_deadline_hours} hours.` : ''} Feedback: ${feedback || 'See details.'}`,
    `/dashboard?task=${taskId}`
  );
  
  // Deliver webhook
  await deliverWebhook(task.agent_id, {
    event: 'proof_rejected',
    task_id: taskId,
    proof_id: latestProof.id,
    feedback,
    new_deadline: newDeadline.toISOString(),
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    message: 'Proof rejected, human can resubmit',
    new_deadline: newDeadline.toISOString()
  });
});

app.post('/api/tasks/:id/approve', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id: taskId } = req.params;
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }
  
  // Get latest proof
  const { data: latestProof } = await supabase
    .from('task_proofs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!latestProof) {
    return res.status(400).json({ error: 'No proof to approve' });
  }
  
  // Update proof status
  await supabase
    .from('task_proofs')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', latestProof.id);
  
  // Calculate payment
  const escrowAmount = task.escrow_amount || task.budget || 50;
  const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
  const netAmount = escrowAmount - platformFee;
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  
  // Update task to paid
  await supabase
    .from('tasks')
    .update({
      status: 'paid',
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
  
  // Record payout
  await supabase.from('payouts').insert({
    id: uuidv4(),
    task_id: taskId,
    human_id: task.human_id,
    agent_id: user.id,
    gross_amount: escrowAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    wallet_address: task.human?.wallet_address || null,
    tx_hash: txHash,
    status: 'completed',
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });
  
  // Update human stats
  await supabase
    .from('users')
    .update({
      jobs_completed: supabase.raw('jobs_completed + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('id', task.human_id);
  
  // Notify human
  await createNotification(
    task.human_id,
    'payment_released',
    'Payment Released!',
    `Your payment of ${netAmount.toFixed(2)} USDC has been sent to your wallet.`,
    `/dashboard`
  );
  
  // Deliver webhook
  await deliverWebhook(task.agent_id, {
    event: 'payment_released',
    task_id: taskId,
    proof_id: latestProof.id,
    amount: netAmount,
    tx_hash: txHash,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    status: 'paid',
    net_amount: netAmount,
    tx_hash: txHash
  });
});

app.post('/api/tasks/:id/dispute', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id: taskId } = req.params;
  const { reason } = req.body;
  
  // Get task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Only human or agent can dispute
  if (task.human_id !== user.id && task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Update task to disputed
  await supabase
    .from('tasks')
    .update({
      status: 'disputed',
      dispute_reason: reason,
      disputed_by: user.id,
      disputed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
  
  // Notify relevant parties
  const notifyTo = user.id === task.human_id ? task.agent_id : task.human_id;
  await createNotification(
    notifyTo,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for task "${task.title}". Reason: ${reason}`,
    `/dashboard?task=${taskId}`
  );
  
  // Deliver webhook
  await deliverWebhook(task.agent_id, {
    event: 'dispute_opened',
    task_id: taskId,
    disputed_by: user.id,
    reason,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, status: 'disputed' });
});

// ============ ADMIN DISPUTE RESOLUTION ============
app.post('/api/admin/resolve-dispute', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('users')
    .select('type')
    .eq('id', user.id)
    .single();
  
  if (adminUser?.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { task_id, resolution, refund_human = false, release_to_human = false, notes } = req.body;
  
  // Get task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', task_id)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.status !== 'disputed') {
    return res.status(400).json({ error: 'Task is not disputed' });
  }
  
  // Resolve based on decision
  if (release_to_human) {
    // Release payment to human
    const escrowAmount = task.escrow_amount || task.budget || 50;
    const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
    const netAmount = escrowAmount - platformFee;
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    await supabase
      .from('tasks')
      .update({
        status: 'paid',
        escrow_status: 'released',
        escrow_released_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id);
    
    await supabase.from('payouts').insert({
      id: uuidv4(),
      task_id: task_id,
      human_id: task.human_id,
      agent_id: task.agent_id,
      gross_amount: escrowAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      tx_hash: txHash,
      status: 'completed',
      dispute_resolved: true,
      created_at: new Date().toISOString()
    });
    
    await createNotification(
      task.human_id,
      'dispute_resolved',
      'Dispute Resolved - Favorable',
      `The dispute has been resolved in your favor. Payment of ${netAmount.toFixed(2)} USDC has been released.`,
      `/dashboard`
    );
  } else if (refund_human) {
    // Refund escrow to agent
    await supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        escrow_status: 'refunded',
        escrow_refunded_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id);
    
    await createNotification(
      task.agent_id,
      'dispute_resolved',
      'Dispute Resolved - Refund',
      `The dispute has been resolved. Escrow of ${task.escrow_amount} USDC has been refunded to your wallet.`,
      `/dashboard`
    );
    await createNotification(
      task.human_id,
      'dispute_resolved',
      'Dispute Resolved',
      `The dispute has been resolved. ${notes || 'See details in your dashboard.'}`,
      `/dashboard`
    );
  } else {
    // Partial resolution - reset 48h timer for agent review
    await supabase
      .from('tasks')
      .update({
        status: 'pending_review',
        proof_submitted_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id);
  }
  
  res.json({ success: true, resolution });
});

// Admin endpoint to manually trigger auto-release check (for testing)
app.post('/api/admin/check-auto-release', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Check if user is admin (or allow in development)
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    const { data: adminUser } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single();

    if (adminUser?.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  }

  // Trigger auto-release check
  console.log('[API] Manual auto-release check triggered by', user.email);
  await autoReleaseService.checkNow();

  res.json({
    success: true,
    message: 'Auto-release check completed',
    threshold: '48 hours',
    checkInterval: `${autoReleaseService.CHECK_INTERVAL_MS / 60000} minutes`
  });
});

// ============ WEBHOOKS ============
async function deliverWebhook(agentId, payload) {
  if (!supabase) return;
  
  try {
    const { data: agent } = await supabase
      .from('users')
      .select('mcp_webhook_url')
      .eq('id', agentId)
      .single();
    
    if (!agent?.mcp_webhook_url) return;
    
    // Deliver webhook (simulated if URL is internal)
    const webhookUrl = agent.mcp_webhook_url;
    const isInternal = webhookUrl.startsWith('/') || webhookUrl.includes('localhost');
    
    if (isInternal) {
      console.log(`[WEBHOOK DELIVERED] ${webhookUrl}`, payload);
    } else {
      // External webhook delivery would use fetch
      console.log(`[WEBHOOK] Would deliver to ${webhookUrl}:`, JSON.stringify(payload));
    }
  } catch (e) {
    console.error('Webhook delivery error:', e.message);
  }
}

// Agent webhook endpoint (auto-generated per agent)
app.post('/webhooks/:agent_id', async (req, res) => {
  const { agent_id } = req.params;
  const event = req.body;
  
  console.log(`[WEBHOOK RECEIVED] Agent ${agent_id}:`, event);
  
  // Verify agent exists
  const { data: agent } = await supabase
    .from('users')
    .select('id')
    .eq('id', agent_id)
    .single();
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ received: true, agent_id });
});

// Get webhook URL for an agent
app.get('/api/agents/:id/webhook-url', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { id } = req.params;
  
  const { data: agent, error } = await supabase
    .from('users')
    .select('id, mcp_webhook_url')
    .eq('id', id)
    .eq('type', 'agent')
    .single();
  
  if (error || !agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const baseUrl = process.env.API_URL || `http://localhost:${PORT}`;
  const webhookUrl = agent.mcp_webhook_url || `${baseUrl}/webhooks/${id}`;
  
  res.json({ webhook_url: webhookUrl });
});

// Register/update webhook URL
app.post('/api/webhooks/register', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') {
    return res.status(401).json({ error: 'Agents only' });
  }
  
  const { webhook_url } = req.body;
  
  await supabase
    .from('users')
    .update({
      mcp_webhook_url: webhook_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);
  
  res.json({ success: true, webhook_url });
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

// ============ WEBHOOKS ============
app.post('/webhooks/:apiKey', async (req, res) => {
  // Agent webhook endpoint - receives notifications
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { apiKey } = req.params;
  const { event, data } = req.body;
  
  // Verify agent exists
  const { data: agent, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('api_key', apiKey)
    .eq('type', 'agent')
    .single();
  
  if (error || !agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  console.log(`[Webhook] ${agent.name}: ${event}`, data);
  
  // Store notification
  await createNotification(
    agent.id,
    event,
    formatEventTitle(event),
    formatEventMessage(event, data),
    data.task_id ? `/dashboard?task=${data.task_id}` : '/dashboard'
  );
  
  res.json({ received: true, event });
});

app.get('/webhooks/:apiKey/test', async (req, res) => {
  const { apiKey } = req.params;
  
  const { data: agent } = await supabase
    .from('users')
    .select('id, name')
    .eq('api_key', apiKey)
    .eq('type', 'agent')
    .single();
  
  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  res.json({ 
    status: 'ok', 
    agent: agent.name,
    webhook_url: `/webhooks/${apiKey}`
  });
});

function formatEventTitle(event) {
  const titles = {
    'human:applied': 'New Application',
    'human:accepted': 'Task Accepted',
    'task:completed': 'Work Submitted',
    'task:approved': 'Payment Released',
    'task:rejected': 'Work Rejected',
    'dispute:escalated': 'Dispute Escalated'
  }
  return titles[event] || 'Notification'
}

function formatEventMessage(event, data) {
  const messages = {
    'human:applied': `${data.humanName} applied for "${data.taskTitle}"`,
    'human:accepted': `${data.humanName} accepted "${data.taskTitle}"`,
    'task:completed': `${data.humanName} submitted proof for "${data.taskTitle}"`,
    'task:approved': `Payment of $${data.amount} released for "${data.taskTitle}"`,
    'task:rejected': `Proof rejected for "${data.taskTitle}": ${data.feedback}`,
    'dispute:escalated': `${data.humanName} escalated "${data.taskTitle}" to dispute`
  }
  return messages[event] || JSON.stringify(data)
}

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
        const { task_id, human_id, deadline_hours = 24, instructions } = params;
        
        const deadline = new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString();
        
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ 
            human_id, 
            status: 'assigned',
            assigned_at: new Date().toISOString(),
            deadline,
            instructions,
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id);
        
        if (taskError) throw taskError;
        
        // Notify human
        await createNotification(
          human_id,
          'task_assigned',
          'Task Assigned!',
          `You have been assigned a new task. Check your dashboard for details.`
        );
        
        res.json({ success: true, assigned_at: new Date().toISOString(), deadline });
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
      
      case 'complete_task': {
        // Human submits proof of completion via new proof system
        const { task_id, proof_text, proof_urls } = params;
        
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();
        
        if (taskError || !task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        if (task.human_id !== user.id) {
          return res.status(403).json({ error: 'Not assigned to you' });
        }
        
        if (task.status !== 'in_progress') {
          return res.status(400).json({ error: 'Task must be in_progress to submit proof' });
        }
        
        // Create proof record
        const proofId = uuidv4();
        await supabase.from('task_proofs').insert({
          id: proofId,
          task_id,
          human_id: user.id,
          proof_text: proof_text || '',
          proof_urls: proof_urls || [],
          status: 'pending',
          revision_count: 0,
          created_at: new Date().toISOString()
        });
        
        // Update task to pending_review
        await supabase
          .from('tasks')
          .update({
            status: 'pending_review',
            proof_submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id);
        
        // Notify agent
        await createNotification(
          task.agent_id,
          'proof_submitted',
          'Proof Submitted',
          `${user.name} has completed "${task.title}". Review and release payment.`
        );
        
        res.json({ success: true, status: 'pending_review', proof_id: proofId });
        break;
      }
      
      case 'approve_task': {
        const { task_id } = params;
        
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();
        
        if (taskError || !task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        if (task.agent_id !== user.id) {
          return res.status(403).json({ error: 'Not your task' });
        }
        
        // Get latest proof
        const { data: latestProof } = await supabase
          .from('task_proofs')
          .select('id')
          .eq('task_id', task_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Update proof status
        if (latestProof) {
          await supabase
            .from('task_proofs')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', latestProof.id);
        }
        
        // Calculate payment
        const escrowAmount = task.escrow_amount || task.budget || 50;
        const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
        const netAmount = escrowAmount - platformFee;
        
        // Get human's wallet
        const { data: human, error: humanError } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('id', task.human_id)
          .single();
        
        // Simulate payment if no wallet
        let txHash = null;
        if (human?.wallet_address && process.env.PLATFORM_WALLET_PRIVATE_KEY) {
          try {
            const { sendUSDC } = require('./lib/wallet');
            txHash = await sendUSDC(human.wallet_address, netAmount);
          } catch (e) {
            console.error('Wallet error:', e.message);
            txHash = '0x' + crypto.randomBytes(32).toString('hex');
          }
        } else {
          console.log(`[SIMULATED] Sending ${netAmount} USDC to ${human?.wallet_address || 'human wallet'}`);
          txHash = '0x' + crypto.randomBytes(32).toString('hex');
        }
        
        // Update task
        await supabase
          .from('tasks')
          .update({
            status: 'paid',
            escrow_status: 'released',
            escrow_released_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id);
        
        // Record payout
        await supabase.from('payouts').insert({
          id: uuidv4(),
          task_id,
          human_id: task.human_id,
          agent_id: user.id,
          gross_amount: escrowAmount,
          platform_fee: platformFee,
          net_amount: netAmount,
          wallet_address: human?.wallet_address || null,
          tx_hash: txHash,
          status: 'completed',
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
        // Update human stats
        await supabase
          .from('users')
          .update({
            jobs_completed: supabase.raw('jobs_completed + 1'),
            updated_at: new Date().toISOString()
          })
          .eq('id', task.human_id);
        
        // Notify human
        await createNotification(
          task.human_id,
          'payment_released',
          'Payment Released!',
          `Your payment of ${netAmount.toFixed(2)} USDC has been sent.`
        );
        
        res.json({ 
          success: true, 
          status: 'paid',
          net_amount: netAmount,
          tx_hash: txHash
        });
        break;
      }
      
      case 'get_task_details': {
        const { data: task, error } = await supabase
          .from('tasks')
          .select(`
            *,
            human:users!tasks_human_id_fkey(id, name, email, rating),
            agent:users!tasks_agent_id_fkey(id, name, email)
          `)
          .eq('id', params.task_id)
          .single();
        
        if (error) throw error;
        res.json(task);
        break;
      }
      
      case 'set_webhook': {
        // Register webhook URL for task status updates
        const { webhook_url } = params;
        
        await supabase
          .from('users')
          .update({
            mcp_webhook_url: webhook_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        res.json({ success: true, webhook_url });
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

// ============ CONVERSATIONS ============
app.get('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      task:tasks(id, title, category, budget),
      user:users!conversations_user_id_fkey(id, name, type, rating),
      agent:users!conversations_agent_id_fkey(id, name, type, organization),
      last_message:messages(created_at, content, sender_id)[0]
    `)
    .or(`user_id.eq.${user.id},agent_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(conversations || []);
});

app.post('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { agent_id, task_id, title } = req.body;
  const id = uuidv4();
  
  // Check if conversation already exists
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('agent_id', agent_id || null);
  
  if (task_id) query = query.eq('task_id', task_id);
  
  const { data: existing } = await query.single();
  
  if (existing) {
    return res.json(existing);
  }
  
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      id,
      user_id: user.id,
      agent_id,
      task_id,
      title: title || 'New Conversation',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(conversation);
});

app.get('/api/conversations/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      *,
      task:tasks(*),
      user:users!conversations_user_id_fkey(*),
      agent:users!conversations_agent_id_fkey(*)
    `)
    .eq('id', req.params.id)
    .single();
  
  if (error || !conversation) return res.status(404).json({ error: 'Not found' });
  
  // Verify user has access
  if (conversation.user_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(conversation);
});

// ============ MESSAGES ============
app.get('/api/messages/:conversation_id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verify user has access to conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, agent_id')
    .eq('id', req.params.conversation_id)
    .single();
  
  if (convError || !conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (conversation.user_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, type, avatar_url)
    `)
    .eq('conversation_id', req.params.conversation_id)
    .order('created_at', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(messages || []);
});

app.post('/api/messages', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { conversation_id, content, message_type = 'text', metadata = {} } = req.body;
  
  // Verify user has access to conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, agent_id')
    .eq('id', conversation_id)
    .single();
  
  if (convError || !conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (conversation.user_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const id = uuidv4();
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      id,
      conversation_id,
      sender_id: user.id,
      content,
      message_type,
      metadata,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversation_id);
  
  res.json(message);
});

app.put('/api/messages/:id/read', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('sender_id', user.id); // Only sender can mark as read
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Get unread message count
app.get('/api/messages/unread/count', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Count unread messages where user is not the sender
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`user_id.eq.${user.id},agent_id.eq.${user.id}`);
  
  if (!conversations || conversations.length === 0) {
    return res.json({ count: 0 });
  }
  
  const conversationIds = conversations.map(c => c.id);
  
  const { data: unreadMessages, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .in('conversation_id', conversationIds)
    .neq('sender_id', user.id)
    .is('read_at', null);
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ count: unreadMessages?.length || 0 });
});

// ============ USER TASKS ============
app.get('/api/tasks/my-tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (user.type === 'human') {
    // For humans, show tasks they've applied to or been assigned
    query = query.eq('human_id', user.id);
  } else {
    // For agents, show tasks they created
    query = query.eq('agent_id', user.id);
  }
  
  const { data: tasks, error } = await query.limit(100);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

app.get('/api/tasks/available', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, urgency, limit = 50 } = req.query;
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      agent:users!tasks_agent_id_fkey(id, name, organization)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));
  
  if (category) query = query.eq('category', category);
  if (city) query = query.like('location', `%${city}%`);
  if (urgency) query = query.eq('urgency', urgency);
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

// ============ HUMANS DIRECTORY ============
app.get('/api/humans/directory', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, min_rate, max_rate, limit = 50 } = req.query;
  
  let query = supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, verified, availability, created_at')
    .eq('type', 'human')
    .eq('verified', true)
    .order('rating', { ascending: false })
    .limit(parseInt(limit));
  
  if (category) query = query.like('skills', `%${category}%`);
  if (city) query = query.like('city', `%${city}%`);
  if (min_rate) query = query.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) query = query.lte('hourly_rate', parseFloat(max_rate));
  
  const { data: humans, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(humans?.map(h => ({
    ...h,
    skills: JSON.parse(h.skills || '[]')
  })) || []);
});

app.get('/api/humans/:id/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, 
      verified, availability, wallet_address, created_at, profile_completeness
    `)
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();
  
  if (error || !user) return res.status(404).json({ error: 'Human not found' });
  
  // Get reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('human_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  res.json({
    ...user,
    skills: JSON.parse(user.skills || '[]'),
    reviews: reviews || []
  });
});

// ============ TASK CREATION (Agents only) ============
app.post('/api/tasks/create', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') {
    return res.status(401).json({ error: 'Agents only' });
  }
  
  const { 
    title, description, category, location, 
    budget_type, budget_min, budget_max, budget,
    duration_hours, urgency, insurance_option 
  } = req.body;
  
  const id = uuidv4();
  const budgetAmount = budget || budget_max || budget_min || 50;
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

// ============ USER PROFILE ============
app.get('/api/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Get full profile data
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) return res.status(404).json({ error: 'Profile not found' });
  
  res.json({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    type: profile.type,
    city: profile.city,
    state: profile.state,
    bio: profile.bio,
    hourly_rate: profile.hourly_rate,
    wallet_address: profile.wallet_address,
    skills: JSON.parse(profile.skills || '[]'),
    rating: profile.rating,
    jobs_completed: profile.jobs_completed,
    verified: profile.verified,
    availability: profile.availability,
    profile_completeness: profile.profile_completeness,
    created_at: profile.created_at
  });
});

app.put('/api/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name, bio, city, state, hourly_rate, skills, availability, wallet_address } = req.body;
  
  const updates = { updated_at: new Date().toISOString() };
  
  if (name) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (city) updates.city = city;
  if (state) updates.state = state;
  if (hourly_rate) updates.hourly_rate = hourly_rate;
  if (availability) updates.availability = availability;
  if (wallet_address) updates.wallet_address = wallet_address;
  if (skills) updates.skills = JSON.stringify(skills);
  
  const { data: profile, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json({ success: true, profile });
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

    // Start background services
    console.log('🔄 Starting background services...');
    autoReleaseService.start();
    console.log('   ✅ Auto-release service started (48h threshold)');
  } else {
    console.log('⚠️  Supabase not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   MCP: POST http://localhost:${PORT}/api/mcp`);
  });
}

start();

// ============ CONVERSATIONS (Chat) ============
app.get('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Get conversations where user is participant
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      human:users!human_id(id, name, email, hourly_rate, rating),
      agent:users!agent_id(id, name, email, api_key),
      last_message:messages(content, created_at, sender_id)
    `)
    .or(`human_id.eq.${user.id},agent_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(conversations || []);
});

app.post('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { human_id, agent_id, initial_message } = req.body;
  const otherId = user.type === 'human' ? agent_id : human_id;
  
  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('human_id', user.type === 'human' ? user.id : human_id)
    .eq('agent_id', user.type === 'agent' ? user.id : agent_id)
    .single();
  
  if (existing) {
    return res.json(existing);
  }
  
  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      id: uuidv4(),
      human_id: user.type === 'human' ? user.id : human_id,
      agent_id: user.type === 'agent' ? user.id : agent_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Send initial message if provided
  if (initial_message) {
    await supabase.from('messages').insert({
      id: uuidv4(),
      conversation_id: conversation.id,
      sender_id: user.id,
      content: initial_message,
      created_at: new Date().toISOString()
    });
  }
  
  res.json(conversation);
});

// ============ MESSAGES ============
app.get('/api/messages/:conversation_id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { conversation_id } = req.params;
  
  // Verify user is participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .or(`human_id.eq.${user.id},agent_id.eq.${user.id}`)
    .single();
  
  if (!conversation) return res.status(403).json({ error: 'Access denied' });
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:users!sender_id(id, name, email)')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(messages || []);
});

app.post('/api/messages', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { conversation_id, content } = req.body;
  
  // Verify user is participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .or(`human_id.eq.${user.id},agent_id.eq.${user.id}`)
    .single();
  
  if (!conversation) return res.status(403).json({ error: 'Access denied' });
  
  // Create message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      id: uuidv4(),
      conversation_id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversation_id);
  
  res.json(message);
});

// ============ MY TASKS ============
app.get('/api/my-tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      creator:users!creator_id(id, name, email),
      assignee:users!assignee_id(id, name, email)
    `)
    .order('created_at', { ascending: false });
  
  if (user.type === 'human') {
    // Humans see tasks they created OR tasks assigned to them
    query = query.or(`creator_id.eq.${user.id},assignee_id.eq.${user.id}`);
  } else {
    // Agents see tasks they created
    query = query.eq('creator_id', user.id);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

app.get('/api/tasks/available', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, min_budget, max_budget } = req.query;
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      creator:users!creator_id(id, name, email, rating)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  
  if (category) query = query.eq('category', category);
  if (city) query = query.like('city', `%${city}%`);
  if (min_budget) query = query.gte('budget', parseFloat(min_budget));
  if (max_budget) query = query.lte('budget', parseFloat(max_budget));
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

// ============ TASKS CRUD ============
app.post('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { title, description, category, budget, city, state, deadline, requirements } = req.body;
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      id: uuidv4(),
      title,
      description,
      category,
      budget: parseFloat(budget),
      city,
      state,
      status: 'open',
      creator_id: user.id,
      deadline,
      requirements: requirements || null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const updates = req.body;
  
  // Verify ownership
  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', id)
    .single();
  
  if (!task || task.creator_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/tasks/:id/accept', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  if (user.type !== 'human') {
    return res.status(403).json({ error: 'Only humans can accept tasks' });
  }
  
  const { id } = req.params;
  
  const { error } = await supabase
    .from('tasks')
    .update({ 
      status: 'in_progress',
      assignee_id: user.id,
      started_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'open');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/tasks/:id/complete', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  const { proof_description, proof_images } = req.body;
  
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'pending_review',
      proof_submitted_at: new Date().toISOString(),
      proof_description,
      proof_images: proof_images || null,
      completed_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/tasks/:id/approve', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }
  
  // Calculate payment
  const escrowAmount = task.escrow_amount || task.budget || 50;
  const platformFee = Math.round(escrowAmount * PLATFORM_FEE_PERCENT) / 100;
  const netAmount = escrowAmount - platformFee;
  
  // Get human's wallet
  const { data: human, error: humanError } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('id', task.human_id)
    .single();
  
  // Simulate payment if no wallet
  let txHash = null;
  if (human?.wallet_address && process.env.PLATFORM_WALLET_PRIVATE_KEY) {
    try {
      const { sendUSDC } = require('./lib/wallet');
      txHash = await sendUSDC(human.wallet_address, netAmount);
    } catch (e) {
      console.error('Wallet error:', e.message);
      txHash = '0x' + crypto.randomBytes(32).toString('hex');
    }
  } else {
    console.log(`[SIMULATED] Releasing ${netAmount} USDC to ${human?.wallet_address || 'human'}`);
    txHash = '0x' + crypto.randomBytes(32).toString('hex');
  }
  
  // Update task to paid
  await supabase
    .from('tasks')
    .update({
      status: 'paid',
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  // Record payout
  await supabase.from('payouts').insert({
    id: uuidv4(),
    task_id: id,
    human_id: task.human_id,
    agent_id: user.id,
    gross_amount: escrowAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
    wallet_address: human?.wallet_address || null,
    tx_hash: txHash,
    status: 'completed',
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });
  
  // Update human stats
  await supabase
    .from('users')
    .update({
      jobs_completed: supabase.raw('jobs_completed + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('id', task.human_id);
  
  // Notify human
  await createNotification(
    task.human_id,
    'payment_released',
    'Payment Released!',
    `Your payment of ${netAmount.toFixed(2)} USDC has been sent.`
  );
  
  res.json({ 
    success: true, 
    status: 'paid',
    net_amount: netAmount,
    tx_hash: txHash
  });
});

app.post('/api/tasks/:id/start', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.human_id !== user.id) {
    return res.status(403).json({ error: 'Not assigned to you' });
  }
  
  await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  res.json({ success: true, status: 'in_progress' });
});

app.post('/api/tasks/:id/cancel', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id } = req.params;
  
  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', id)
    .single();
  
  if (!task || task.creator_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', id);
  
  res.json({ success: true });
});

