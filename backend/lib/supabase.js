// Supabase Client Configuration
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

module.exports = { supabase };
