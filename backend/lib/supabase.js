// Supabase client for irlwork backend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to handle Supabase responses
export async function queryOne(table, select = '*', filters = {}) {
  let query = supabase.from(table).select(select);
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function queryMany(table, select = '*', options = {}) {
  let query = supabase.from(table).select(select);
  
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query = query.eq(key, value);
    }
  }
  
  if (options.order) {
    query = query.order(options.order.by || 'created_at', { ascending: false });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function update(table, filters, updates) {
  let query = supabase.from(table).update(updates);
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query.select();
  if (error) throw error;
  return data;
}

export async function remove(table, filters) {
  let query = supabase.from(table).delete();
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  const { error } = await query;
  if (error) throw error;
  return true;
}

export { supabase as default };
