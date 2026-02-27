// /backend/lib/supabase.js
// Supabase database client

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Public client (for authenticated requests)
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Admin client (for privileged operations)
const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

// Helper: UUID generation (if uuid-ossp not available)
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper: Parse JSON fields
function parseJsonFields(row, jsonFields = ['skills']) {
  const parsed = { ...row };
  jsonFields.forEach(field => {
    if (parsed[field] && typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch (e) {}
    }
  });
  return parsed;
}

// ================== USER OPERATIONS ==================

// Safe columns for user queries — excludes password_hash, webhook_secret
const USER_SAFE_COLUMNS = 'id, email, name, type, api_key, avatar_url, bio, hourly_rate, account_type, city, state, service_radius, skills, social_links, profile_completeness, availability, rating, jobs_completed, verified, wallet_address, stripe_account_id, created_at, updated_at';

async function getUserById(id) {
  const { data, error } = await supabase.from('users').select(USER_SAFE_COLUMNS).eq('id', id).single();
  if (error) return null;
  return parseJsonFields(data);
}

async function getUserByEmail(email) {
  const { data, error } = await supabase.from('users').select(USER_SAFE_COLUMNS).eq('email', email).single();
  if (error) return null;
  return parseJsonFields(data);
}

async function getUserByApiKey(apiKey) {
  const { data, error } = await supabase.from('users').select(USER_SAFE_COLUMNS).eq('api_key', apiKey).single();
  if (error) return null;
  return parseJsonFields(data);
}

async function createUser(userData) {
  const { data, error } = await supabase.from('users').insert(userData).select().single();
  if (error) throw error;
  return data;
}

async function updateUser(id, updates) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ================== HUMAN OPERATIONS ==================

async function listHumans(filters = {}) {
  let query = supabase.from('users').select(USER_SAFE_COLUMNS).eq('type', 'human').eq('verified', true);
  
  if (filters.category) {
    query = query.contains('skills', [filters.category]);
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters.min_rate) {
    query = query.gte('hourly_rate', parseFloat(filters.min_rate));
  }
  if (filters.max_rate) {
    query = query.lte('hourly_rate', parseFloat(filters.max_rate));
  }
  
  query = query.order('rating', { ascending: false }).limit(100);
  
  const { data, error } = await query;
  if (error) throw error;
  return data.map(row => parseJsonFields(row));
}

async function getHumanProfile(id) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, profile_completeness')
    .eq('id', id)
    .eq('type', 'human')
    .single();
  
  if (error) return null;
  
  return {
    ...parseJsonFields(user)
  };
}

// ================== TASK OPERATIONS ==================

async function createTask(taskData) {
  const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
  if (error) throw error;
  return data;
}

async function getTask(taskId) {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (error) return null;
  return data;
}

async function getTasksByAgent(agentId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function assignTaskToHuman(taskId, humanId) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      human_id: humanId,
      status: 'assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ================== PAYOUT OPERATIONS ==================

async function createPayout(payoutData) {
  const { data, error } = await supabase.from('payouts').insert(payoutData).select().single();
  if (error) throw error;
  return data;
}

async function getPayoutsByHuman(humanId) {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('human_id', humanId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ================== NOTIFICATIONS ==================

async function createNotification(notificationData) {
  const { data, error } = await supabase.from('notifications').insert(notificationData).select().single();
  if (error) throw error;
  return data;
}

async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  supabaseAdmin,
  uuid,
  parseJsonFields,
  // User
  getUserById,
  getUserByEmail,
  getUserByApiKey,
  createUser,
  updateUser,
  // Human
  listHumans,
  getHumanProfile,
  // Task
  createTask,
  getTask,
  getTasksByAgent,
  updateTask,
  assignTaskToHuman,
  // Payout
  createPayout,
  getPayoutsByHuman,
  // Notifications
  createNotification,
  getNotifications,
};
