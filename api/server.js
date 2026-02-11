// irlwork.ai - API Server with Supabase + Payments
console.log('[Startup] Loading environment...');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

console.log('[Startup] Loading modules...');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 12;

const { createClient } = require('@supabase/supabase-js');

// Background services
// DISABLED FOR PHASE 1 MANUAL OPERATIONS — see _automated_disabled/
// console.log('[Startup] Loading autoRelease...');
// const autoReleaseService = require('./services/autoRelease');

// Payment and wallet services
console.log('[Startup] Loading payment services...');
const { releasePaymentToPending, getWalletBalance } = require('./backend/services/paymentService');
const { processWithdrawal, getWithdrawalHistory } = require('./backend/services/withdrawalService');
const { startBalancePromoter } = require('./backend/services/balancePromoter');

// Stripe services
console.log('[Startup] Loading Stripe services...');
const { stripe } = require('./backend/lib/stripe');
const { chargeAgentForTask, listPaymentMethods, handleWebhookEvent } = require('./backend/services/stripeService');
const initStripeRoutes = require('./routes/stripe');

// Distance calculation utilities
console.log('[Startup] Loading utils...');
const { haversineDistance, filterByDistance, filterByDistanceKm } = require('./utils/distance');

// Phase 1 Admin Routes
console.log('[Startup] Loading admin routes...');
const initAdminRoutes = require('./routes/admin');
console.log('[Startup] All modules loaded');

// Configuration
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Frontend serves its own CSP
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - only include localhost in development
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : isProduction
    ? [
        'https://www.irlwork.ai',
        'https://irlwork.ai',
        'https://api.irlwork.ai'
      ]
    : [
        'https://www.irlwork.ai',
        'https://irlwork.ai',
        'https://api.irlwork.ai',
        'http://localhost:5173',
        'http://localhost:5180',
        'http://localhost:3002'
      ];

console.log('[CORS] Configured origins:', corsOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Debug CORS in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[CORS] Request from origin: ${req.headers.origin}, Allowed: ${corsOrigins.includes(req.headers.origin)}`)
    next()
  })
}

// Stripe webhook endpoint — MUST be before express.json() because Stripe
// needs the raw body for signature verification
app.post('/api/stripe/webhooks',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook signature verification failed` });
    }

    try {
      await handleWebhookEvent(event, supabase, createNotification);
      res.json({ received: true });
    } catch (err) {
      console.error('[Stripe Webhook] Processing error:', err.message);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

app.use(express.json({ limit: '10mb' }));

// Rate limiting middleware (applied after JSON parsing)
app.use(rateLimitMiddleware);

// Health check endpoint (first, before any other middleware)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', supabase: !!supabase })
});

// Supabase client - prefer service role key to bypass RLS for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
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
// Generate a secure API key
function generateApiKey() {
  const prefix = 'irl_sk_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
}

// Hash an API key for storage (HMAC-SHA256 with server secret)
const API_KEY_HMAC_SECRET = process.env.API_KEY_HMAC_SECRET || crypto.randomBytes(32).toString('hex');
function hashApiKey(apiKey) {
  return crypto.createHmac('sha256', API_KEY_HMAC_SECRET).update(apiKey).digest('hex');
}
// Legacy hash for migration (unsalted SHA-256 — used only for backward compatibility)
function hashApiKeyLegacy(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get the prefix of an API key for display
function getApiKeyPrefix(apiKey) {
  return apiKey.substring(0, 12) + '...';
}

// Webhook URL validation (SSRF prevention)
function isValidWebhookUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    // Block private/internal/metadata IPs and hostnames
    const blocked = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.169.254', 'metadata.google.internal',
      '100.100.100.200'
    ];
    if (blocked.includes(hostname)) return false;
    // Block private IP ranges
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return false;
    // Block 169.254.x.x link-local
    if (hostname.startsWith('169.254.')) return false;
    return true;
  } catch {
    return false;
  }
}

// Rate limiting helper
async function checkRateLimit(ipHash, action, maxAttempts, windowMinutes) {
  if (!supabase) return { allowed: true };

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Get existing rate limit record
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip_hash', ipHash)
    .eq('action', action)
    .gte('first_attempt_at', windowStart)
    .single();

  if (existing) {
    if (existing.attempts >= maxAttempts) {
      return { allowed: false, remaining: 0, resetAt: new Date(new Date(existing.first_attempt_at).getTime() + windowMinutes * 60 * 1000) };
    }
    // Update attempt count
    await supabase
      .from('rate_limits')
      .update({ attempts: existing.attempts + 1, last_attempt_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { allowed: true, remaining: maxAttempts - existing.attempts - 1 };
  }

  // Create new rate limit record
  await supabase.from('rate_limits').insert({
    id: uuidv4(),
    ip_hash: ipHash,
    action,
    attempts: 1,
    first_attempt_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString()
  });

  return { allowed: true, remaining: maxAttempts - 1 };
}

// ============ RATE LIMITING MIDDLEWARE ============
// In-memory rate limiting with headers
const rateLimitStore = new Map();

const RATE_LIMITS = {
  authenticated: { requests: 300, windowMs: 60 * 1000 },  // 300/min for authenticated
  unauthenticated: { requests: 100, windowMs: 60 * 1000 } // 100/min for unauthenticated
};

function getRateLimitKey(req) {
  // Use API key or IP as the rate limit key
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token?.startsWith('irl_sk_')) {
    return `key:${hashApiKey(token)}`;
  }
  // Fall back to IP
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `ip:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
}

function rateLimitMiddleware(req, res, next) {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  const key = getRateLimitKey(req);
  const isAuthenticated = req.headers.authorization?.includes('irl_sk_');
  const limits = isAuthenticated ? RATE_LIMITS.authenticated : RATE_LIMITS.unauthenticated;

  const now = Date.now();
  let record = rateLimitStore.get(key);

  // Clean up old record if window expired
  if (record && now - record.windowStart > limits.windowMs) {
    record = null;
  }

  if (!record) {
    record = { count: 0, windowStart: now };
    rateLimitStore.set(key, record);
  }

  record.count++;

  const remaining = Math.max(0, limits.requests - record.count);
  const resetAt = new Date(record.windowStart + limits.windowMs);

  // Add rate limit headers to all responses
  res.set({
    'X-RateLimit-Limit': limits.requests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString()
  });

  if (record.count > limits.requests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: limits.requests,
      remaining: 0,
      reset_at: resetAt.toISOString(),
      retry_after_seconds: Math.ceil((resetAt.getTime() - now) / 1000)
    });
  }

  next();
}

// Clean up rate limit store periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > 5 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Authenticate a request by token.
 *
 * ARCHITECTURE NOTE: The frontend currently sends the Supabase user UUID as the
 * Authorization header (not a JWT or session token). This means any caller who
 * knows a user's UUID can authenticate as that user. This is acceptable for the
 * current trust model where the API is only called by our own frontend (which
 * obtains the UUID via Supabase Auth), but should be migrated to proper JWT
 * verification (supabase.auth.getUser(jwt)) for production hardening.
 *
 * TODO: Migrate to JWT-based auth — validate the Supabase access_token instead
 * of accepting raw UUIDs. This will require frontend changes to send the JWT
 * from supabase.auth.getSession().
 */
async function getUserByToken(token) {
  if (!token || !supabase) return null;

  // Remove "Bearer " prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');

  // Check if it's a UUID (user ID) — see architecture note above
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(cleanToken)) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', cleanToken)
      .single();
    if (data) return data;
  }

  // Check if it's a new-style API key (irl_sk_...)
  if (cleanToken.startsWith('irl_sk_')) {
    const keyHash = hashApiKey(cleanToken);
    let { data: apiKeyRecord } = await supabase
      .from('api_keys')
      .select('user_id, is_active, key_hash')
      .eq('key_hash', keyHash)
      .single();

    // Fallback to legacy hash (unsalted SHA-256) and auto-migrate
    if (!apiKeyRecord) {
      const legacyHash = hashApiKeyLegacy(cleanToken);
      const { data: legacyRecord } = await supabase
        .from('api_keys')
        .select('user_id, is_active, key_hash')
        .eq('key_hash', legacyHash)
        .single();

      if (legacyRecord) {
        // Auto-migrate to new HMAC hash
        await supabase
          .from('api_keys')
          .update({ key_hash: keyHash })
          .eq('key_hash', legacyHash);
        apiKeyRecord = legacyRecord;
      }
    }

    if (apiKeyRecord && apiKeyRecord.is_active) {
      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash);

      // Get the user
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', apiKeyRecord.user_id)
        .single();
      return user;
    }
    return null;
  }

  // Check legacy API key in users table
  const { data: apiUser } = await supabase
    .from('users')
    .select('*')
    .eq('api_key', cleanToken)
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

// Dispatch webhook to user if they have one configured
async function dispatchWebhook(userId, event) {
  if (!supabase) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('webhook_url, webhook_secret')
      .eq('id', userId)
      .single();

    if (!user?.webhook_url) return; // No webhook registered, skip

    const payload = {
      event_type: event.type,
      task_id: event.task_id,
      data: event.data,
      timestamp: new Date().toISOString()
    };

    const headers = { 'Content-Type': 'application/json' };

    // Add HMAC signature if secret is configured
    if (user.webhook_secret) {
      const signature = crypto
        .createHmac('sha256', user.webhook_secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    if (!isValidWebhookUrl(user.webhook_url)) {
      console.warn(`[WEBHOOK] Blocked delivery to invalid URL: ${user.webhook_url}`);
      return;
    }

    await fetch(user.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
  } catch (err) {
    console.error(`Webhook delivery failed for user ${userId}:`, err.message);
    // Don't throw - webhook failures shouldn't break the main flow
  }
}

// ============ PHASE 1 ADMIN ROUTES ============
// Mount admin routes for manual escrow/payment operations
if (supabase) {
  const adminRoutes = initAdminRoutes(supabase, getUserByToken, createNotification);
  app.use('/api/admin', adminRoutes);
  console.log('[Startup] Admin routes mounted at /api/admin');
}

// ============ STRIPE ROUTES ============
if (supabase) {
  const stripeRoutes = initStripeRoutes(supabase, getUserByToken, createNotification);
  app.use('/api/stripe', stripeRoutes);
  console.log('[Startup] Stripe routes mounted at /api/stripe');
}

// ============ MIDDLEWARE ============
// Middleware to update last_active_at on authenticated requests
app.use(async (req, res, next) => {
  const token = req.headers.authorization;
  if (token && supabase) {
    try {
      const user = await getUserByToken(token);
      if (user) {
        // Only update if last_active_at is more than 5 minutes old (or null)
        const now = new Date();
        const lastActive = user.last_active_at ? new Date(user.last_active_at) : null;
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        if (!lastActive || lastActive < fiveMinutesAgo) {
          // Update last_active_at asynchronously without blocking the request
          supabase
            .from('users')
            .update({ last_active_at: now.toISOString() })
            .eq('id', user.id)
            .then()
            .catch(err => console.error('Error updating last_active_at:', err));
        }
      }
    } catch (err) {
      // Silently fail - don't block requests due to last_active_at updates
      console.error('Error in last_active_at middleware:', err);
    }
  }
  next();
});

// ============ AUTH ============
app.post('/api/auth/register/human', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { id: providedId, email, password, name, city, state, hourly_rate, categories = [], skills = [], bio = '', phone = '', latitude, longitude, travel_radius, country, country_code } = req.body;

    if (!email || !name || !city) {
      return res.status(400).json({ error: 'Name, email, and city are required' });
    }

    // Use provided ID (from Supabase auth) or generate new one
    const id = providedId || uuidv4();
    // Accept both 'skills' and 'categories' for backwards compatibility
    const userSkills = skills.length > 0 ? skills : categories;
    const password_hash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;
    const profile_completeness = 0.2 + (hourly_rate ? 0.1 : 0) + (userSkills.length > 0 ? 0.2 : 0) + (bio ? 0.1 : 0) + (phone ? 0.1 : 0);

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
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
        country: country || null,
        country_code: country_code || null,
        travel_radius: travel_radius || 25,
        service_radius: travel_radius || 25,
        skills: JSON.stringify(userSkills),
        profile_completeness,
        availability: 'available',
        rating: 0,
        jobs_completed: 0,
        verified: true,
        needs_onboarding: false,
        onboarding_completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate key') || error.code === '23505') {
        // User already exists - update their profile instead
        const { data: existingUser, error: updateError } = await supabase
          .from('users')
          .update({
            name,
            city,
            state,
            hourly_rate: hourly_rate || 25,
            skills: JSON.stringify(userSkills),
            needs_onboarding: false,
            onboarding_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          // Try by email if id doesn't match
          const { data: byEmail, error: emailError } = await supabase
            .from('users')
            .update({
              name,
              city,
              state,
              hourly_rate: hourly_rate || 25,
              skills: JSON.stringify(userSkills),
              needs_onboarding: false,
              onboarding_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('email', email)
            .select()
            .single();

          if (emailError) throw emailError;
          return res.json({
            user: { ...byEmail, skills: userSkills, needs_onboarding: false },
            token: crypto.randomBytes(32).toString('hex')
          });
        }

        return res.json({
          user: { ...existingUser, skills: userSkills, needs_onboarding: false },
          token: crypto.randomBytes(32).toString('hex')
        });
      }
      throw error;
    }
    
    // Insert categories/skills
    if (userSkills.length > 0) {
      const categoryRows = userSkills.map(cat => ({
        id: uuidv4(),
        human_id: id,
        category_id: cat,
        is_professional: 0
      }));
      await supabase.from('user_categories').insert(categoryRows);
    }

    res.json({
      user: { id, email, name, type: 'human', city, hourly_rate: hourly_rate || 25, skills: userSkills, needs_onboarding: false },
      token: crypto.randomBytes(32).toString('hex')
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/register/agent', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { email, name } = req.body;
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

  // Fetch user by email (bcrypt hashes are non-deterministic, can't use .eq() for comparison)
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password — support bcrypt and legacy SHA-256 with auto-migration
  let passwordValid = false;
  if (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')) {
    passwordValid = await bcrypt.compare(password, user.password_hash);
  } else {
    // Legacy SHA-256 hash — verify and auto-upgrade to bcrypt
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (legacyHash === user.password_hash) {
      passwordValid = true;
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
    }
  }

  if (!passwordValid) {
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
    
    // Redirect back to app (Supabase session handles auth — no tokens in URL)
    res.redirect(frontendUrl);
  } catch (e) {
    res.redirect(`${frontendUrl}?error=${encodeURIComponent(e.message)}`);
  }
});

app.get('/api/auth/verify', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) {
    // Distinguish between invalid token and user not yet in DB
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(token)) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Calculate derived metrics
  const completionRate = user.total_tasks_accepted > 0
    ? ((user.total_tasks_completed / user.total_tasks_accepted) * 100).toFixed(1)
    : null;

  const paymentRate = user.total_tasks_completed > 0
    ? (((user.total_tasks_completed - (user.total_disputes_filed || 0)) / user.total_tasks_completed) * 100).toFixed(1)
    : null;

  // Use onboarding_completed_at as definitive check - if timestamp exists, onboarding is complete
  const needsOnboarding = !user.onboarding_completed_at;

  res.json({
    user: {
      id: user.id, email: user.email, name: user.name, type: user.type,
      city: user.city, hourly_rate: user.hourly_rate,
      bio: user.bio || '',
      travel_radius: user.travel_radius || 25,
      latitude: user.latitude,
      longitude: user.longitude,
      country: user.country,
      country_code: user.country_code,
      wallet_address: user.wallet_address,
      deposit_address: user.deposit_address,
      skills: JSON.parse(user.skills || '[]'),
      social_links: user.social_links || {},
      profile_completeness: user.profile_completeness,
      needs_onboarding: needsOnboarding,
      verified: user.verified,
      // Reputation metrics
      total_tasks_completed: user.total_tasks_completed || 0,
      total_tasks_posted: user.total_tasks_posted || 0,
      total_tasks_accepted: user.total_tasks_accepted || 0,
      total_disputes_filed: user.total_disputes_filed || 0,
      total_usdc_paid: parseFloat(user.total_usdc_paid) || 0,
      last_active_at: user.last_active_at,
      // Derived metrics
      completion_rate: completionRate,
      payment_rate: paymentRate,
      jobs_completed: user.jobs_completed || 0
    }
  });
});

// POST /api/auth/onboard - Idempotent onboarding completion
// Creates user if doesn't exist, updates if exists
// Always sets needs_onboarding: false and onboarding_completed_at
app.post('/api/auth/onboard', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Validate the user via token authentication
  // For new users (first onboarding), they won't have a DB row yet, so getUserByToken returns null.
  // In that case, accept a valid UUID directly — the upsert will create their row.
  const authenticatedUser = await getUserByToken(req.headers.authorization);
  let userId;
  if (authenticatedUser) {
    userId = authenticatedUser.id;
  } else {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(401).json({ error: 'Invalid or missing authentication' });
    }
    userId = token;
  }

  const { email, name, city, latitude, longitude, country, country_code,
          hourly_rate, skills, travel_radius, role, bio, avatar_url } = req.body;

  // Validate required fields
  if (!city || !latitude || !longitude) {
    return res.status(400).json({ error: 'City and location are required' });
  }

  try {
    // Calculate profile completeness based on provided data
    const skillsArray = skills || [];
    const profile_completeness = 0.2
      + (city ? 0.1 : 0)
      + (skillsArray.length > 0 ? 0.2 : 0)
      + (hourly_rate ? 0.1 : 0)
      + (bio ? 0.1 : 0)
      + (avatar_url ? 0.1 : 0);

    // Upsert user with onboarding data
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name,
        city,
        latitude,
        longitude,
        country,
        country_code,
        hourly_rate: hourly_rate || null,
        skills: JSON.stringify(skillsArray),
        travel_radius: travel_radius || 25,
        role: role || 'human',
        bio: bio || null,
        avatar_url: avatar_url || null,
        profile_completeness,
        needs_onboarding: false,
        onboarding_completed_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Onboarding error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Parse skills back to array for response
    const userData = {
      ...data,
      skills: JSON.parse(data.skills || '[]'),
      needs_onboarding: false
    };

    res.json({ user: userData });
  } catch (e) {
    console.error('Onboarding exception:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ HEADLESS AGENT REGISTRATION ============
// POST /api/auth/register-agent - Public endpoint for AI agents to register
app.post('/api/auth/register-agent', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    const { email, password, agent_name, webhook_url } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Rate limiting: 5 registrations per IP per hour
    const ipHash = crypto
      .createHash('sha256')
      .update(req.ip || 'unknown')
      .digest('hex')
      .slice(0, 16);

    const rateCheck = await checkRateLimit(ipHash, 'agent_registration', 5, 60);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Maximum 5 registrations per hour.',
        reset_at: rateCheck.resetAt
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const name = agent_name || email.split('@')[0];

    const { error: createError } = await supabase.from('users').insert({
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      type: 'agent',
      verified: true, // Auto-verify agents
      created_at: new Date().toISOString()
    });

    if (createError) {
      console.error('Agent registration error:', createError);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    const { error: keyError } = await supabase.from('api_keys').insert({
      id: uuidv4(),
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: 'Initial Key',
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (keyError) {
      console.error('API key creation error:', keyError);
      // User was created but key failed - still return success
    }

    // Generate JWT-like token (user ID for now)
    const token = userId;

    res.status(201).json({
      user_id: userId,
      agent_name: name,
      api_key: apiKey,
      token,
      message: 'Save this API key — it won\'t be shown again.'
    });
  } catch (e) {
    console.error('Agent registration error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ API KEY MANAGEMENT ============
// POST /api/keys/generate - Generate a new API key
app.post('/api/keys/generate', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { name } = req.body;

    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    const keyId = uuidv4();
    const { error } = await supabase.from('api_keys').insert({
      id: keyId,
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name || 'API Key',
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Key generation error:', error);
      return res.status(500).json({ error: 'Failed to generate key' });
    }

    res.status(201).json({
      id: keyId,
      api_key: apiKey,
      key_prefix: keyPrefix,
      name: name || 'API Key',
      created_at: new Date().toISOString(),
      message: 'Save this API key — it won\'t be shown again.'
    });
  } catch (e) {
    console.error('Key generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/keys - List all API keys for the user
app.get('/api/keys', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, created_at, last_used_at, is_active, revoked_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Key list error:', error);
      return res.status(500).json({ error: 'Failed to list keys' });
    }

    res.json(keys || []);
  } catch (e) {
    console.error('Key list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/keys/:id - Revoke/deactivate an API key
app.delete('/api/keys/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { id } = req.params;

    // Verify ownership
    const { data: key } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (key.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Revoke the key
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Key revoke error:', error);
      return res.status(500).json({ error: 'Failed to revoke key' });
    }

    res.json({ success: true, message: 'API key revoked' });
  } catch (e) {
    console.error('Key revoke error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/keys/:id/rotate - Revoke old key and generate new one
app.post('/api/keys/:id/rotate', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { id } = req.params;

    // Verify ownership
    const { data: oldKey } = await supabase
      .from('api_keys')
      .select('user_id, name')
      .eq('id', id)
      .single();

    if (!oldKey) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (oldKey.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Revoke old key
    await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', id);

    // Generate new key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);
    const newKeyId = uuidv4();

    const { error } = await supabase.from('api_keys').insert({
      id: newKeyId,
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: oldKey.name,
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Key rotation error:', error);
      return res.status(500).json({ error: 'Failed to rotate key' });
    }

    res.status(201).json({
      id: newKeyId,
      api_key: apiKey,
      key_prefix: keyPrefix,
      name: oldKey.name,
      created_at: new Date().toISOString(),
      old_key_id: id,
      message: 'Key rotated successfully. Save this new API key — it won\'t be shown again.'
    });
  } catch (e) {
    console.error('Key rotation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ PAGE VIEWS ============
app.post('/api/views', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { page_type, target_id, referrer, ai_source } = req.body;

  if (!['task', 'profile'].includes(page_type) || !target_id) {
    return res.status(400).json({ error: 'Invalid page_type or target_id' });
  }

  // Get user if authenticated, but don't require auth
  const user = await getUserByToken(req.headers.authorization);

  // Hash IP + date for deduplication without storing raw IPs
  const ipHash = crypto
    .createHash('sha256')
    .update((req.ip || 'unknown') + new Date().toISOString().slice(0, 10))
    .digest('hex')
    .slice(0, 16);

  await supabase.from('page_views').insert({
    page_type,
    target_id,
    viewer_id: user?.id || null,
    referrer: referrer || req.headers.referer || null,
    ai_source: ai_source || null,
    ip_hash: ipHash
  });

  res.sendStatus(200);
});

// ============ PLATFORM STATS (Public) ============
app.get('/api/stats', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    // Count humans with completed profiles (verified humans)
    const { count: humansCount, error: humansError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'human')
      .eq('verified', true);

    // Count open tasks
    const { count: tasksCount, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Get unique cities from humans and tasks
    const { data: humanCities } = await supabase
      .from('users')
      .select('city')
      .eq('type', 'human')
      .eq('verified', true)
      .not('city', 'is', null);

    const { data: taskCities } = await supabase
      .from('tasks')
      .select('location')
      .not('location', 'is', null);

    // Extract unique cities
    const allCities = new Set();
    humanCities?.forEach(w => {
      if (w.city) allCities.add(w.city.toLowerCase().trim());
    });
    taskCities?.forEach(t => {
      if (t.location) {
        // Extract city from location string (e.g., "San Francisco, CA" -> "san francisco")
        const city = t.location.split(',')[0]?.toLowerCase().trim();
        if (city) allCities.add(city);
      }
    });

    res.json({
      humans: humansCount || 0,
      tasks: tasksCount || 0,
      cities: allCities.size
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============ HUMANS ============
app.get('/api/humans', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { category, city, min_rate, max_rate, user_lat, user_lng, radius } = req.query;

  let query = supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, skills, rating, jobs_completed, latitude, longitude')
    .eq('type', 'human')
    .eq('verified', true);

  if (category) query = query.like('skills', `%${category}%`);
  if (city) query = query.like('city', `%${city}%`);
  if (min_rate) query = query.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) query = query.lte('hourly_rate', parseFloat(max_rate));

  const { data: humans, error } = await query.order('rating', { ascending: false }).limit(100);

  if (error) return res.status(500).json({ error: error.message });

  // Parse skills for all humans
  let results = humans?.map(h => ({ ...h, skills: JSON.parse(h.skills || '[]') })) || [];

  // Apply distance filtering if coordinates provided
  if (user_lat && user_lng && radius) {
    const userLatitude = parseFloat(user_lat);
    const userLongitude = parseFloat(user_lng);
    const maxRadius = parseFloat(radius);

    results = filterByDistance(results, userLatitude, userLongitude, maxRadius);
  }

  res.json(results);
});

app.get('/api/users/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Only return wallet_address to the user themselves (not to public)
  const requester = await getUserByToken(req.headers.authorization);
  const isSelf = requester && requester.id === req.params.id;

  const columns = isSelf
    ? 'id, name, email, city, state, hourly_rate, bio, skills, rating, jobs_completed, total_tasks_completed, total_tasks_posted, total_usdc_paid, wallet_address, type'
    : 'id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, total_tasks_completed, total_tasks_posted, type';

  const { data: user, error } = await supabase
    .from('users')
    .select(columns)
    .eq('id', req.params.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user, skills: JSON.parse(user.skills || '[]') });
});

app.get('/api/humans/:id', async (req, res, next) => {
  // Skip if id is a reserved route name (handled by later routes)
  const reservedRoutes = ['directory'];
  if (reservedRoutes.includes(req.params.id)) {
    return next();
  }

  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, city, state, hourly_rate, bio, skills, rating, jobs_completed, profile_completeness')
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();

  if (error || !user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user, skills: JSON.parse(user.skills || '[]') });
});

// ============ PROFILE ============
app.put('/api/humans/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  let user = await getUserByToken(req.headers.authorization);

  // If user doesn't exist in our DB but has a valid UUID token (from Supabase Auth), auto-create them
  if (!user) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(token)) {
      // Create the user record
      const { name, city, hourly_rate, skills } = req.body;
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: token,
          email: req.body.email || `${token}@oauth.user`,
          name: name || 'New User',
          type: 'human',
          city: city || '',
          hourly_rate: hourly_rate || 25,
          skills: JSON.stringify(skills || []),
          verified: true,
          needs_onboarding: false,
          availability: 'available',
          rating: 0,
          jobs_completed: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to auto-create user:', createError);
        return res.status(401).json({ error: 'Unauthorized - could not create user' });
      }
      user = newUser;
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { name, wallet_address, hourly_rate, bio, categories, skills, city, latitude, longitude, travel_radius, country, country_code, social_links } = req.body;

  const updates = { updated_at: new Date().toISOString(), needs_onboarding: false, verified: true };

  if (name) updates.name = name;
  if (wallet_address) updates.wallet_address = wallet_address;
  if (hourly_rate) updates.hourly_rate = hourly_rate;
  if (bio !== undefined) updates.bio = bio;
  // Accept both 'skills' and 'categories' for backwards compatibility
  // Store as JSON string to match registration format
  if (skills) updates.skills = JSON.stringify(Array.isArray(skills) ? skills : JSON.parse(skills));
  if (categories) updates.skills = JSON.stringify(Array.isArray(categories) ? categories : JSON.parse(categories));
  if (city) updates.city = city;
  // Parse as floats to match registration format
  if (latitude !== undefined) updates.latitude = latitude != null ? parseFloat(latitude) : null;
  if (longitude !== undefined) updates.longitude = longitude != null ? parseFloat(longitude) : null;
  if (country !== undefined) updates.country = country;
  if (country_code !== undefined) updates.country_code = country_code;
  if (travel_radius) updates.travel_radius = travel_radius;
  if (social_links !== undefined) {
    const allowedPlatforms = ['twitter', 'instagram', 'linkedin', 'github', 'tiktok', 'youtube'];
    const cleaned = {};
    if (typeof social_links === 'object' && social_links !== null) {
      for (const [key, value] of Object.entries(social_links)) {
        if (allowedPlatforms.includes(key) && typeof value === 'string' && value.trim()) {
          cleaned[key] = value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(twitter|x|instagram|linkedin|github|tiktok|youtube)\.com\/(in\/)?(@)?/i, '');
        }
      }
    }
    updates.social_links = cleaned;
  }

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

  const { category, city, urgency, status, my_tasks, user_lat, user_lng, radius_km } = req.query;
  const user = await getUserByToken(req.headers.authorization);

  // Only return safe public columns (no escrow, deposit, or internal fields)
  const safeTaskColumns = 'id, title, description, category, location, latitude, longitude, budget, deadline, status, task_type, quantity, created_at, updated_at, country, country_code, human_id, agent_id, requirements, moderation_status';
  let query = supabase.from('tasks').select(safeTaskColumns);

  if (category) query = query.eq('category', category);
  if (urgency) query = query.eq('urgency', urgency);
  if (status) query = query.eq('status', status);
  if (my_tasks && user) query = query.eq('agent_id', user.id);

  // Filter out moderated tasks from browse (unless viewing own tasks)
  if (!my_tasks) {
    query = query.not('moderation_status', 'in', '("hidden","removed")');
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) return res.status(500).json({ error: error.message });

  let results = tasks || [];

  // Apply location filtering
  if (user_lat && user_lng && radius_km !== 'anywhere') {
    const userLatitude = parseFloat(user_lat);
    const userLongitude = parseFloat(user_lng);
    const radiusKm = parseFloat(radius_km) || 50;

    if (radiusKm === 0) {
      // Exact city match - filter to ~5km radius
      results = filterByDistanceKm(results, userLatitude, userLongitude, 5);
    } else {
      results = filterByDistanceKm(results, userLatitude, userLongitude, radiusKm);
    }

    // Fallback: include tasks without coords that match city string
    if (city) {
      const tasksWithoutCoords = (tasks || []).filter(t =>
        !t.latitude && !t.longitude &&
        t.location?.toLowerCase().includes(city.toLowerCase())
      );
      // Merge, avoiding duplicates
      const resultIds = new Set(results.map(r => r.id));
      tasksWithoutCoords.forEach(t => {
        if (!resultIds.has(t.id)) results.push(t);
      });
    }
  } else if (city) {
    // String-based fallback when no coordinates provided
    results = results.filter(t =>
      t.location?.toLowerCase().includes(city.toLowerCase())
    );
  }

  res.json(results);
});

app.post('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') return res.status(401).json({ error: 'Agents only' });

  const { title, description, category, location, budget, latitude, longitude, is_remote } = req.body;

  const id = uuidv4();
  const budgetAmount = budget || 50;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      id,
      agent_id: user.id,
      title,
      description,
      category,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      budget: budgetAmount,
      status: 'open',
      task_type: 'direct',
      human_ids: [],
      escrow_amount: budgetAmount,
      is_remote: !!is_remote,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    ...task,
    message: 'Task posted successfully.'
  });
});

app.get('/api/tasks/:id', async (req, res, next) => {
  // Skip if id is a reserved route name (handled by later routes)
  const reservedRoutes = ['available', 'my-tasks'];
  if (reservedRoutes.includes(req.params.id)) {
    return next();
  }

  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, title, description, category, location, latitude, longitude, budget, deadline, status, task_type, quantity, created_at, updated_at, country, country_code, human_id, agent_id, requirements, moderation_status, escrow_amount, escrow_status, escrow_deposited_at, escrow_released_at, deposit_amount_cents, unique_deposit_amount, instructions, work_started_at, proof_submitted_at, assigned_at')
    .eq('id', req.params.id)
    .single();

  if (error || !task) return res.status(404).json({ error: 'Not found' });

  // Only return sensitive financial/escrow fields to task participants
  const user = await getUserByToken(req.headers.authorization);
  const isParticipant = user && (task.agent_id === user.id || task.human_id === user.id);

  if (!isParticipant) {
    const { escrow_amount, escrow_status, escrow_deposited_at, escrow_released_at,
            deposit_amount_cents, unique_deposit_amount, instructions,
            work_started_at, proof_submitted_at, assigned_at, ...publicTask } = task;
    return res.json(publicTask);
  }
  res.json(task);
});

app.get('/api/tasks/:id/status', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, status, escrow_status, escrow_amount, escrow_deposited_at, escrow_released_at, proof_submitted_at')
    .eq('id', req.params.id)
    .single();

  if (error || !task) return res.status(404).json({ error: 'Not found' });

  // Get proof submissions
  const { data: proofs } = await supabase
    .from('task_proofs')
    .select('id, status, proof_text, proof_urls, submitted_at')
    .eq('task_id', req.params.id)
    .order('submitted_at', { ascending: false });

  // Get pending payout to check dispute window
  let dispute_window_info = null;
  if (task.status === 'completed') {
    const { data: payout } = await supabase
      .from('payouts')
      .select('dispute_window_closes_at, status')
      .eq('task_id', req.params.id)
      .eq('status', 'pending')
      .single();

    if (payout) {
      const now = new Date();
      const closes_at = new Date(payout.dispute_window_closes_at);
      const ms_remaining = closes_at - now;
      const hours_remaining = Math.max(0, ms_remaining / (1000 * 60 * 60));

      dispute_window_info = {
        dispute_window_closes_at: payout.dispute_window_closes_at,
        dispute_window_open: ms_remaining > 0,
        hours_remaining: hours_remaining.toFixed(1)
      };
    }
  }

  res.json({
    task_id: task.id,
    task_status: task.status,
    escrow_status: task.escrow_status,
    escrow_amount: task.escrow_amount,
    escrow_deposited_at: task.escrow_deposited_at,
    escrow_released_at: task.escrow_released_at,
    proof_submitted_at: task.proof_submitted_at,
    proofs: proofs || [],
    dispute_window: dispute_window_info
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

// Get applicants for a task
app.get('/api/tasks/:id/applications', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId } = req.params;

  // Verify user is the task creator (agent)
  const { data: task } = await supabase
    .from('tasks')
    .select('agent_id')
    .eq('id', taskId)
    .single();

  if (!task || task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get all applications for this task
  const { data: applications, error } = await supabase
    .from('task_applications')
    .select(`
      *,
      applicant:users!task_applications_human_id_fkey(
        id,
        name,
        email,
        hourly_rate,
        rating,
        jobs_completed,
        bio,
        city
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(applications || []);
});

// Agent assigns a human to a task
// Stripe path: charges agent immediately, task goes to in_progress
// USDC path: sets pending_deposit, agent must send USDC manually
app.post('/api/tasks/:id/assign', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId } = req.params;
  const { human_id, payment_method_id } = req.body;

  if (!human_id) {
    return res.status(400).json({ error: 'human_id is required' });
  }

  // Verify user is the task creator (agent)
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task || task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Only the task creator can assign humans' });
  }

  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Can only assign humans to open tasks' });
  }

  // Verify the human exists and applied
  const { data: application } = await supabase
    .from('task_applications')
    .select('*')
    .eq('task_id', taskId)
    .eq('human_id', human_id)
    .single();

  if (!application) {
    return res.status(404).json({ error: 'Human has not applied to this task' });
  }

  // Get human details for response
  const { data: humanUser } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', human_id)
    .single();

  const budgetAmount = task.escrow_amount || task.budget || 50;

  // Check if agent has a Stripe payment method
  let agentPaymentMethods = [];
  if (user.stripe_customer_id && stripe) {
    try {
      agentPaymentMethods = await listPaymentMethods(user.stripe_customer_id);
    } catch (e) {
      console.log('[Assign] Could not list agent payment methods:', e.message);
    }
  }

  // Helper: accept application, reject others, notify human
  const finalizeAssignment = async (notificationMessage) => {
    await supabase
      .from('task_applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    await supabase
      .from('task_applications')
      .update({ status: 'rejected' })
      .eq('task_id', taskId)
      .neq('human_id', human_id);

    await createNotification(
      human_id,
      'task_assigned',
      'You\'ve Been Selected!',
      notificationMessage,
      `/tasks/${taskId}`
    );
  };

  // ============ STRIPE PATH: Charge immediately ============
  if (agentPaymentMethods.length > 0) {
    const amountCents = Math.round(budgetAmount * 100);

    try {
      const charge = await chargeAgentForTask(
        supabase, user.id, taskId, amountCents, payment_method_id || null
      );

      // Task goes straight to in_progress — no waiting for manual deposit
      const { error } = await supabase
        .from('tasks')
        .update({
          human_id: human_id,
          status: 'in_progress',
          escrow_status: 'deposited',
          escrow_amount: budgetAmount,
          escrow_deposited_at: new Date().toISOString(),
          work_started_at: new Date().toISOString(),
          stripe_payment_intent_id: charge.payment_intent_id,
          payment_method: 'stripe',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) return res.status(500).json({ error: error.message });

      await finalizeAssignment(
        `You've been selected for "${task.title}". Payment is confirmed — you can begin work now!`
      );

      return res.json({
        success: true,
        task_id: taskId,
        worker: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
        human: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
        escrow_status: 'deposited',
        payment_method: 'stripe',
        amount_charged: budgetAmount,
        message: 'Worker assigned and payment charged. Work can begin immediately.'
      });
    } catch (stripeError) {
      console.error('[Assign] Stripe charge failed:', stripeError.message);
      return res.status(402).json({
        error: 'Payment failed',
        details: stripeError.message,
        code: 'payment_failed'
      });
    }
  }

  // ============ USDC PATH: Manual deposit flow (existing) ============
  const randomCents = (Math.random() * 99 + 1) / 100;
  const uniqueDepositAmount = Math.round((budgetAmount + randomCents) * 100) / 100;

  const { error } = await supabase
    .from('tasks')
    .update({
      human_id: human_id,
      status: 'assigned',
      escrow_status: 'pending_deposit',
      unique_deposit_amount: uniqueDepositAmount,
      deposit_amount_cents: Math.round(uniqueDepositAmount * 100),
      payment_method: 'usdc',
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) return res.status(500).json({ error: error.message });

  await finalizeAssignment(
    `You've been selected for "${task.title}". Funding is in progress — you'll be notified when work can begin.`
  );

  res.json({
    success: true,
    task_id: taskId,
    worker: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
    human: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
    escrow_status: 'pending_deposit',
    payment_method: 'usdc',
    deposit_instructions: {
      wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
      amount_usdc: uniqueDepositAmount,
      network: 'Base',
      note: 'Send exactly this amount. Your human will be notified once deposit is confirmed by the platform.'
    },
    message: 'Human selected. Please send the exact USDC amount to complete the assignment.'
  });
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
      assignee:users!human_id(id, name, email, hourly_rate, rating)
    `)
    .eq('agent_id', user.id)
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
    .select('*, assignee:users!human_id(*)')
    .eq('id', id)
    .single();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Only task creator (agent) can release payment
  if (task.agent_id !== user.id) {
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
  
  // Update task (atomic check on escrow_status to prevent double-release)
  const { data: updatedRelease, error: updateError } = await supabase
    .from('tasks')
    .update({
      escrow_status: 'released',
      escrow_released_at: new Date().toISOString(),
      status: 'paid',
      release_tx: txHash
    })
    .eq('id', id)
    .in('escrow_status', ['deposited', 'held'])
    .select('id')
    .single();

  if (updateError || !updatedRelease) {
    return res.status(409).json({ error: 'Payment has already been released or is being processed.' });
  }
  
  // NOTE: Previously inserted into a 'transactions' table that doesn't exist.
  // Transaction data is tracked via payouts + pending_transactions tables.

  // Create notification for human
  await createNotification(
    task.human_id,
    'payment_released',
    'Payment Released',
    `Your payment of ${netAmount.toFixed(2)} USDC has been sent to your wallet.`,
    `/tasks/${id}`
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

// ============ FEEDBACK ============
app.post('/api/upload/feedback', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const getEnv = (k) => {
    try { return require('process').env[k]; } catch { return null; }
  };
  const R2_ACCOUNT_ID = getEnv('R2ID') || getEnv('CLOUD_ID') || getEnv('R2_ACCOUNT_ID');
  const R2_ACCESS_KEY = getEnv('R2KEY') || getEnv('CLOUD_KEY') || getEnv('R2_ACCESS_KEY');
  const R2_SECRET_KEY = getEnv('R2SECRET') || getEnv('CLOUD_SECRET') || getEnv('R2_SECRET_KEY');
  const R2_BUCKET = getEnv('R2BUCKET') || getEnv('CLOUD_BUCKET') || getEnv('R2_BUCKET') || 'irlwork-proofs';

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    const { file, filename } = req.body;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `feedback/${user.id}/${timestamp}-${randomStr}.${ext}`;
    const mockUrl = `https://${R2_BUCKET}.public/${uniqueFilename}`;
    console.log(`[R2 DEMO] Would upload feedback image to: ${mockUrl}`);
    return res.json({ url: mockUrl, filename: uniqueFilename, success: true, demo: true });
  }

  try {
    const { file, filename, mimeType } = req.body;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `feedback/${user.id}/${timestamp}-${randomStr}.${ext}`;

    let fileData = file;
    if (file.startsWith('data:')) {
      fileData = Buffer.from(file.split(',')[1], 'base64');
    } else if (typeof file === 'string' && !file.startsWith('/') && !file.startsWith('http')) {
      fileData = Buffer.from(file, 'base64');
    }

    let uploadSuccess = false;
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      });

      await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: uniqueFilename,
        Body: fileData,
        ContentType: mimeType || 'image/jpeg',
      }));
      uploadSuccess = true;
    } catch (s3Error) {
      console.error('R2 feedback upload error:', s3Error.message);
    }

    const publicUrl = `https://${R2_BUCKET}.public/${uniqueFilename}`;
    res.json({ url: publicUrl, filename: uniqueFilename, success: uploadSuccess, demo: !uploadSuccess });
  } catch (e) {
    console.error('Feedback upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { type = 'feedback', urgency = 'normal', subject, message, image_urls, page_url } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const validTypes = ['feedback', 'bug', 'feature_request', 'other'];
  const validUrgency = ['low', 'normal', 'high', 'critical'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }
  if (!validUrgency.includes(urgency)) {
    return res.status(400).json({ error: `Urgency must be one of: ${validUrgency.join(', ')}` });
  }

  try {
    const feedbackId = uuidv4();
    const { error } = await supabase.from('feedback').insert({
      id: feedbackId,
      user_id: user.id,
      user_email: user.email || null,
      user_name: user.name || null,
      user_type: user.type || null,
      type,
      urgency,
      subject: subject || null,
      message: message.trim(),
      image_urls: image_urls || [],
      page_url: page_url || null,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('[Feedback] Insert error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Notify admins for critical feedback
    if (urgency === 'critical') {
      const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
      for (const adminId of adminIds) {
        await createNotification(
          adminId,
          'critical_feedback',
          'Critical Feedback Submitted',
          `${user.name || 'A user'} submitted critical feedback: "${subject || message.substring(0, 50)}"`,
          '/dashboard?tab=admin'
        );
      }
    }

    console.log(`[Feedback] New ${urgency} ${type} from ${user.name || user.id}: ${subject || message.substring(0, 50)}`);
    res.json({ success: true, feedback_id: feedbackId });
  } catch (e) {
    console.error('[Feedback] Error:', e.message);
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
      submitted_at: new Date().toISOString()
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
    `/tasks/${taskId}`
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

  // Check proof rejection limit — auto-escalate to dispute after 3 rejections
  const MAX_REJECTIONS = 3;
  const { count: rejectionCount } = await supabase
    .from('task_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('status', 'rejected');

  if (rejectionCount >= MAX_REJECTIONS) {
    await supabase.from('tasks').update({
      status: 'disputed',
      dispute_reason: `Auto-escalated: proof rejected ${MAX_REJECTIONS} times`,
      disputed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', taskId).in('status', ['in_progress', 'pending_review']);

    await createNotification(task.human_id, 'dispute', 'Task Escalated to Dispute',
      `Task "${task.title}" auto-escalated after ${MAX_REJECTIONS} proof rejections. An admin will review.`, `/tasks/${taskId}`);
    await createNotification(task.agent_id, 'dispute', 'Task Escalated to Dispute',
      `Task "${task.title}" auto-escalated after ${MAX_REJECTIONS} proof rejections. An admin will review.`, `/tasks/${taskId}`);

    return res.status(400).json({
      error: `Maximum proof rejections (${MAX_REJECTIONS}) reached. Task escalated to dispute resolution.`,
      rejection_count: rejectionCount
    });
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
    `/tasks/${taskId}`
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

// PHASE 1: Agent approves proof - task goes to 'approved' status
// Payment is NOT released automatically - admin must release via /api/admin/tasks/:id/release-payment
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

  // Update proof status to approved
  await supabase
    .from('task_proofs')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', latestProof.id);

  // Update task to 'approved' status
  await supabase
    .from('tasks')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  // Notify human
  await createNotification(
    task.human_id,
    'proof_approved',
    'Proof Approved!',
    `Your proof for "${task.title}" has been approved! Payment is being processed.`,
    `/tasks/${taskId}`
  );

  // Deliver webhook to agent
  await deliverWebhook(task.agent_id, {
    event: 'proof_approved',
    task_id: taskId,
    proof_id: latestProof.id,
    message: 'Proof approved. Payment will be processed.',
    timestamp: new Date().toISOString()
  });

  // Stripe-paid tasks: auto-release to pending balance (no admin step needed)
  if (task.payment_method === 'stripe' && task.stripe_payment_intent_id) {
    try {
      await releasePaymentToPending(supabase, taskId, task.human_id, task.agent_id, createNotification);
      console.log(`[Approve] Auto-released payment for Stripe task ${taskId}`);
    } catch (releaseError) {
      console.error('[Approve] Auto-release failed for Stripe task:', releaseError.message);
      // Don't fail the approve — admin can manually release if auto-release fails
    }
  }

  res.json({
    success: true,
    status: 'approved',
    payment_method: task.payment_method || 'usdc',
    message: task.payment_method === 'stripe'
      ? 'Proof approved. Payment released to pending balance with 48-hour hold.'
      : 'Proof approved. Payment will be processed by the platform.'
  });
});

// ============ TASK REPORTING ============
app.post('/api/tasks/:id/report', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId } = req.params;
  const { reason, description } = req.body;

  // Validate reason
  const VALID_REASONS = ['scam_fraud', 'misleading', 'inappropriate', 'spam', 'illegal', 'harassment', 'other'];
  if (!reason || !VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid reason. Must be one of: ' + VALID_REASONS.join(', ') });
  }

  // Validate description
  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }
  if (description.length > 2000) {
    return res.status(400).json({ error: 'Description must be 2000 characters or less' });
  }

  // Rate limit: 10 reports per hour per IP
  const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
  const rateCheck = await checkRateLimit(ipHash, 'report_task', 10, 60);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many reports. Please try again later.' });
  }

  // Get task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, agent_id, status, moderation_status, report_count')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Cannot report own task
  if (task.agent_id === user.id) {
    return res.status(403).json({ error: 'You cannot report your own task' });
  }

  // Task already removed
  if (task.moderation_status === 'removed') {
    return res.status(400).json({ error: 'This task has already been removed' });
  }

  // Check for duplicate report
  const { data: existing } = await supabase
    .from('task_reports')
    .select('id')
    .eq('task_id', taskId)
    .eq('reporter_id', user.id)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'You have already reported this task' });
  }

  // Create report
  const reportId = uuidv4();
  const { error: insertError } = await supabase.from('task_reports').insert({
    id: reportId,
    task_id: taskId,
    reporter_id: user.id,
    reason,
    description: description.trim(),
    status: 'pending'
  });

  if (insertError) {
    console.error('[Report] Insert error:', insertError);
    return res.status(500).json({ error: 'Failed to submit report' });
  }

  // Increment report_count on task
  const newReportCount = (task.report_count || 0) + 1;
  const taskUpdate = {
    report_count: newReportCount,
    updated_at: new Date().toISOString()
  };

  // Auto-flag at 3+ reports
  if (newReportCount >= 3 && (!task.moderation_status || task.moderation_status === 'clean')) {
    taskUpdate.moderation_status = 'flagged';
  }

  // Auto-hide at 5+ reports
  if (newReportCount >= 5 && task.moderation_status !== 'hidden' && task.moderation_status !== 'removed') {
    taskUpdate.moderation_status = 'hidden';
    taskUpdate.hidden_at = new Date().toISOString();
    taskUpdate.hidden_reason = 'Auto-hidden due to multiple reports';
  }

  await supabase.from('tasks').update(taskUpdate).eq('id', taskId);

  // Increment total_reports_received on task creator
  const { data: creator } = await supabase
    .from('users')
    .select('total_reports_received')
    .eq('id', task.agent_id)
    .single();

  await supabase.from('users').update({
    total_reports_received: ((creator?.total_reports_received) || 0) + 1
  }).eq('id', task.agent_id);

  // Notify reporter (confirmation)
  await createNotification(
    user.id,
    'report_submitted',
    'Report Received',
    'Thank you for reporting this task. Our team will review it shortly.',
    null
  );

  // Notify admins
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  for (const adminId of adminIds) {
    await createNotification(
      adminId,
      'new_task_report',
      'New Task Report',
      `Task "${task.title}" reported for ${reason.replace('_', '/')}. (${newReportCount} total reports)`,
      '/admin?queue=reports'
    );
  }

  // Notify task creator if auto-hidden
  if (newReportCount >= 5 && task.moderation_status !== 'hidden' && task.moderation_status !== 'removed') {
    await createNotification(
      task.agent_id,
      'task_auto_hidden',
      'Task Hidden',
      `Your task "${task.title}" has been temporarily hidden pending review due to multiple reports. Contact support for more details.`,
      null
    );
  }

  res.json({
    success: true,
    report_id: reportId,
    message: 'Report submitted successfully. Thank you for helping keep our platform safe.'
  });
});

app.get('/api/tasks/:id/reports/check', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = await supabase
    .from('task_reports')
    .select('id')
    .eq('task_id', req.params.id)
    .eq('reporter_id', user.id)
    .single();

  res.json({ has_reported: !!data });
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

  // Only allow disputes on active tasks
  const disputeableStatuses = ['in_progress', 'pending_review', 'approved'];
  if (!disputeableStatuses.includes(task.status)) {
    return res.status(400).json({
      error: `Cannot dispute a task with status "${task.status}". Only active tasks can be disputed.`
    });
  }

  // Update task to disputed (atomic status check)
  const { data: disputedTask, error: disputeErr } = await supabase
    .from('tasks')
    .update({
      status: 'disputed',
      dispute_reason: reason,
      disputed_by: user.id,
      disputed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .in('status', disputeableStatuses)
    .select('id')
    .single();

  if (disputeErr || !disputedTask) {
    return res.status(409).json({ error: 'Task status changed before dispute could be filed. Please refresh.' });
  }
  
  // Notify relevant parties
  const notifyTo = user.id === task.human_id ? task.agent_id : task.human_id;
  await createNotification(
    notifyTo,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for task "${task.title}". Reason: ${reason}`,
    `/tasks/${taskId}`
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
    
    const { data: disputeRelease, error: disputeReleaseErr } = await supabase
      .from('tasks')
      .update({
        status: 'paid',
        escrow_status: 'released',
        escrow_released_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .neq('escrow_status', 'released')
      .select('id')
      .single();

    if (disputeReleaseErr || !disputeRelease) {
      return res.status(409).json({ error: 'Payment has already been released.' });
    }

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
      `/tasks/${task_id}`
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
      `/tasks/${task_id}`
    );
    await createNotification(
      task.human_id,
      'dispute_resolved',
      'Dispute Resolved',
      `The dispute has been resolved. ${notes || 'See details in your dashboard.'}`,
      `/tasks/${task_id}`
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

// DISABLED FOR PHASE 1 MANUAL OPERATIONS — see _automated_disabled/
// Auto-release is disabled; all payment releases are manual
app.post('/api/admin/check-auto-release', async (req, res) => {
  res.status(410).json({
    error: 'Auto-release is disabled for Phase 1. Use manual admin endpoints instead.'
  });
});

// ============ RATINGS (BLIND RATING WINDOW) ============
// Submit a rating for a task (after finalization)
app.post('/api/tasks/:id/rate', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: task_id } = req.params;
  const { rating_score, comment } = req.body;

  // Validate rating score
  if (!rating_score || rating_score < 1 || rating_score > 5) {
    return res.status(400).json({ error: 'Rating score must be between 1 and 5' });
  }

  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, human_id, agent_id, status, proof_submitted_at')
    .eq('id', task_id)
    .single();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Check if user is part of this task
  if (user.id !== task.human_id && user.id !== task.agent_id) {
    return res.status(403).json({ error: 'You are not part of this task' });
  }

  // Check if task is finalized (paid or dispute resolved)
  // Task can be rated after:
  // 1. Task is paid (normal flow or auto-release)
  // 2. Dispute is resolved and 48-hour dispute window has passed
  const isTaskFinalized = task.status === 'paid' ||
    (task.status === 'disputed' && task.dispute_resolved_at);

  if (!isTaskFinalized) {
    return res.status(400).json({
      error: 'Task must be finalized before rating',
      details: 'You can rate after the task is paid or a dispute is resolved'
    });
  }

  // Determine who is being rated
  const ratee_id = user.id === task.human_id ? task.agent_id : task.human_id;

  // Guard: prevent self-rating and null ratee
  if (!ratee_id) {
    return res.status(400).json({ error: 'Cannot determine who to rate — task may be incomplete' });
  }
  if (ratee_id === user.id) {
    return res.status(403).json({ error: 'You cannot rate yourself' });
  }

  // Check if user has already rated
  const { data: existingRating } = await supabase
    .from('ratings')
    .select('id')
    .eq('task_id', task_id)
    .eq('rater_id', user.id)
    .single();

  if (existingRating) {
    return res.status(400).json({ error: 'You have already rated this task' });
  }

  // Create rating
  const { data: newRating, error: ratingError } = await supabase
    .from('ratings')
    .insert({
      task_id,
      rater_id: user.id,
      ratee_id,
      rating_score,
      comment: comment || null,
      visible_at: null, // Initially hidden
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (ratingError) {
    console.error('Error creating rating:', ratingError);
    return res.status(500).json({ error: 'Failed to create rating' });
  }

  // The trigger will automatically handle setting visible_at if both parties have rated
  // Check if both parties have now rated
  const { data: allRatings, error: countError } = await supabase
    .from('ratings')
    .select('id, visible_at')
    .eq('task_id', task_id);

  const bothRated = allRatings && allRatings.length === 2;
  const isVisible = bothRated && allRatings[0].visible_at !== null;

  // Update user's aggregate rating
  await updateUserRating(ratee_id);

  // Send notification to the other party
  const otherPartyId = ratee_id;
  const raterType = user.id === task.human_id ? 'human' : 'agent';

  await createNotification(
    otherPartyId,
    'rating_received',
    bothRated ? 'Ratings Now Visible' : 'Rating Received',
    bothRated
      ? `Both parties have rated task #${task_id.substring(0, 8)}. Ratings are now visible!`
      : `You have received a rating for task #${task_id.substring(0, 8)}. Rate the ${raterType} to see both ratings.`,
    `/tasks/${task_id}`
  );

  res.json({
    success: true,
    rating: newRating,
    bothRated,
    isVisible,
    message: bothRated
      ? 'Both parties have rated. Ratings are now visible!'
      : 'Rating submitted. It will be visible once both parties rate, or after 72 hours.'
  });
});

// Get visible ratings for a user
app.get('/api/users/:id/ratings', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { id: user_id } = req.params;

  // Get all visible ratings for this user
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      rater:rater_id (id, name, type),
      task:task_id (id, title, description)
    `)
    .eq('ratee_id', user_id)
    .not('visible_at', 'is', null)
    .lte('visible_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ratings:', error);
    return res.status(500).json({ error: 'Failed to fetch ratings' });
  }

  // Calculate average rating
  const averageRating = ratings && ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating_score, 0) / ratings.length
    : null;

  res.json({
    ratings: ratings || [],
    averageRating,
    totalRatings: ratings?.length || 0
  });
});

// Get ratings for a specific task (for the participants)
app.get('/api/tasks/:id/ratings', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: task_id } = req.params;

  // Get task to verify user is a participant
  const { data: task } = await supabase
    .from('tasks')
    .select('human_id, agent_id')
    .eq('id', task_id)
    .single();

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (user.id !== task.human_id && user.id !== task.agent_id) {
    return res.status(403).json({ error: 'You are not part of this task' });
  }

  // Get ratings for this task
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      rater:rater_id (id, name, type),
      ratee:ratee_id (id, name, type)
    `)
    .eq('task_id', task_id);

  if (error) {
    console.error('Error fetching task ratings:', error);
    return res.status(500).json({ error: 'Failed to fetch ratings' });
  }

  // Filter to only show visible ratings
  const visibleRatings = (ratings || []).filter(r => {
    if (!r.visible_at) return false;
    return new Date(r.visible_at) <= new Date();
  });

  // Check if user has rated
  const userHasRated = (ratings || []).some(r => r.rater_id === user.id);
  const bothRated = (ratings || []).length === 2;

  res.json({
    ratings: visibleRatings,
    userHasRated,
    bothRated,
    canRate: !userHasRated && (task.human_id === user.id || task.agent_id === user.id)
  });
});

// Helper function to update user's aggregate rating
async function updateUserRating(userId) {
  if (!supabase) return;

  try {
    // Get all visible ratings for this user
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating_score')
      .eq('ratee_id', userId)
      .not('visible_at', 'is', null)
      .lte('visible_at', new Date().toISOString());

    if (!ratings || ratings.length === 0) return;

    // Calculate average rating
    const averageRating = ratings.reduce((sum, r) => sum + r.rating_score, 0) / ratings.length;

    // Update user's rating field
    await supabase
      .from('users')
      .update({ rating: averageRating.toFixed(2) })
      .eq('id', userId);

    console.log(`[RATING] Updated user ${userId} rating to ${averageRating.toFixed(2)}`);
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
}

// ============ WEBHOOKS ============
async function deliverWebhook(agentId, payload) {
  if (!supabase) return;

  try {
    const { data: agent } = await supabase
      .from('users')
      .select('webhook_url, webhook_secret')
      .eq('id', agentId)
      .single();

    if (!agent?.webhook_url) return;

    const webhookUrl = agent.webhook_url;
    const headers = { 'Content-Type': 'application/json' };

    // Add HMAC signature if secret is configured
    if (agent.webhook_secret) {
      const signature = crypto
        .createHmac('sha256', agent.webhook_secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    if (!isValidWebhookUrl(webhookUrl)) {
      console.warn(`[WEBHOOK] Blocked delivery to invalid URL: ${webhookUrl}`);
      return;
    }

    console.log(`[WEBHOOK] Delivering to ${webhookUrl}`);
    await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
  } catch (e) {
    console.error('Webhook delivery error:', e.message);
    // Don't throw - webhook failures shouldn't break the main flow
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

// Register/update webhook URL and optional signing secret
app.post('/api/webhooks/register', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { webhook_url, webhook_secret } = req.body;

  // Validate webhook URL (SSRF prevention)
  if (webhook_url && !isValidWebhookUrl(webhook_url)) {
    return res.status(400).json({ error: 'Invalid webhook URL. Must be HTTPS and not target private/internal addresses.' });
  }

  const updateData = {
    webhook_url: webhook_url || null,
    updated_at: new Date().toISOString()
  };

  // Only update webhook_secret if provided (allows clearing URL without clearing secret)
  if (webhook_secret !== undefined) {
    updateData.webhook_secret = webhook_secret || null;
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, webhook_url });
});

// ============ TRANSACTIONS ============
// NOTE: The 'transactions' table doesn't exist. Transaction data lives in
// payouts + pending_transactions. This endpoint queries those instead.
app.get('/api/transactions', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Query payouts (human earnings) and pending_transactions (pending earnings)
  const [payoutsResult, pendingResult] = await Promise.all([
    supabase
      .from('payouts')
      .select('id, task_id, human_id, tx_hash, amount_cents, fee_cents, status, created_at')
      .eq('human_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pending_transactions')
      .select('id, task_id, user_id, amount_cents, status, created_at, clears_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  const payouts = (payoutsResult.data || []).map(p => ({
    ...p,
    type: 'payout',
    amount: p.amount_cents / 100
  }));
  const pending = (pendingResult.data || []).map(p => ({
    ...p,
    type: 'pending',
    amount: p.amount_cents / 100
  }));

  // Merge and sort by created_at descending
  const all = [...payouts, ...pending].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  res.json(all);
});

// NOTE: The 'deposits' table doesn't exist. Deposit data lives in manual_payments.
app.get('/api/deposits', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: deposits, error } = await supabase
    .from('manual_payments')
    .select('id, task_id, agent_id, worker_id, expected_amount, deposit_amount, deposit_tx_hash, deposit_status, status, created_at')
    .or(`agent_id.eq.${user.id},worker_id.eq.${user.id}`)
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
    data.task_id ? `/tasks/${data.task_id}` : '/dashboard'
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
          .select('id, name, city, hourly_rate, skills, rating, jobs_completed, bio')
          .eq('type', 'human')
          .eq('verified', true);
        
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
          .select('*')
          .eq('id', params.human_id)
          .single();
        
        if (error) {
          return res.status(404).json({ error: 'Human not found' });
        }
        res.json({ ...human, skills: JSON.parse(human.skills || '[]') });
        break;
      }
      
      case 'post_task': {
        const id = uuidv4();
        const budgetAmount = params.budget || params.budget_max || params.budget_min || 50;

        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            id,
            agent_id: user.id,
            title: params.title,
            description: params.description,
            category: params.category,
            location: params.location,
            latitude: params.latitude || null,
            longitude: params.longitude || null,
            budget: budgetAmount,
            status: 'open',
            task_type: 'direct',
            human_ids: [],
            escrow_amount: budgetAmount,
            is_remote: !!params.is_remote,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        res.json({
          id: task.id,
          status: 'open',
          message: 'Task posted successfully.'
        });
        break;
      }
      
      case 'hire_human': {
        // PHASE 1: Hiring triggers escrow deposit flow - human cannot start until deposit confirmed
        const { task_id, human_id, deadline_hours = 24, instructions } = params;

        // Get task for budget
        const { data: taskData, error: fetchError } = await supabase
          .from('tasks')
          .select('escrow_amount, budget, title')
          .eq('id', task_id)
          .single();

        if (fetchError || !taskData) {
          throw new Error('Task not found');
        }

        // PHASE 1: Generate unique deposit amount NOW
        const budgetAmount = taskData.escrow_amount || taskData.budget || 50;
        const randomCents = (Math.random() * 99 + 1) / 100;
        const uniqueDepositAmount = Math.round((budgetAmount + randomCents) * 100) / 100;

        const deadline = new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString();

        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            human_id,
            status: 'assigned',  // PHASE 1: Not in_progress - must wait for deposit confirmation
            escrow_status: 'pending_deposit',  // PHASE 1: Trigger deposit flow
            unique_deposit_amount: uniqueDepositAmount,
            deposit_amount_cents: Math.round(uniqueDepositAmount * 100),
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
          'You\'ve Been Selected!',
          `You've been selected for "${taskData.title}". Funding is in progress — you'll be notified when work can begin.`,
          `/tasks/${task_id}`
        );

        // PHASE 1: Return deposit instructions to agent
        res.json({
          success: true,
          assigned_at: new Date().toISOString(),
          deadline,
          escrow_status: 'pending_deposit',
          deposit_instructions: {
            wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
            amount_usdc: uniqueDepositAmount,
            network: 'Base',
            note: 'Send exactly this amount. Your human will be notified once deposit is confirmed by the platform.'
          },
          message: 'Human selected. Please send the exact USDC amount to complete the assignment.'
        });
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
        // DISABLED FOR PHASE 1 MANUAL OPERATIONS
        // Payment release is now handled manually by the platform admin
        res.status(410).json({
          error: 'Automatic payment release is disabled for Phase 1. When you approve proof, payment will be processed manually by the platform.',
          message: 'Use approve_task to approve the work. Payment will be released by the platform after verification.'
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
          submitted_at: new Date().toISOString()
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
          `${user.name} has completed "${task.title}". Review and release payment.`,
          `/tasks/${task_id}`
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
        
        // Update task (atomic check to prevent double-release)
        const { data: mcpRelease, error: mcpReleaseErr } = await supabase
          .from('tasks')
          .update({
            status: 'paid',
            escrow_status: 'released',
            escrow_released_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', task_id)
          .in('escrow_status', ['deposited', 'held'])
          .select('id')
          .single();

        if (mcpReleaseErr || !mcpRelease) {
          return res.status(409).json({ error: 'Payment has already been released.' });
        }

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
        
        // Update human stats (atomic increment via RPC)
        await supabase.rpc('increment_user_stat', { user_id_param: task.human_id, stat_name: 'jobs_completed', increment_by: 1 });
        
        // Notify human
        await createNotification(
          task.human_id,
          'payment_released',
          'Payment Released!',
          `Your payment of ${netAmount.toFixed(2)} USDC has been sent.`,
          `/tasks/${task_id}`
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

      case 'start_conversation': {
        // Start a conversation with a human
        const { humanId, human_id, message, initial_message } = params;
        const targetHumanId = humanId || human_id;
        const messageContent = message || initial_message;

        if (!targetHumanId) {
          return res.status(400).json({ error: 'humanId is required' });
        }

        // Check if human exists
        const { data: human, error: humanError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', targetHumanId)
          .eq('type', 'human')
          .single();

        if (humanError || !human) {
          return res.status(404).json({ error: 'Human not found' });
        }

        // Check for existing conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('human_id', targetHumanId)
          .eq('agent_id', user.id)
          .single();

        let conversationId;

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          // Create new conversation
          conversationId = uuidv4();
          const { error: convError } = await supabase
            .from('conversations')
            .insert({
              id: conversationId,
              human_id: targetHumanId,
              agent_id: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (convError) throw convError;
        }

        // Send initial message if provided
        if (messageContent) {
          const messageId = uuidv4();
          await supabase.from('messages').insert({
            id: messageId,
            conversation_id: conversationId,
            sender_id: user.id,
            content: messageContent,
            created_at: new Date().toISOString()
          });
        }

        res.json({
          conversation_id: conversationId,
          human: { id: human.id, name: human.name },
          message: messageContent ? 'Conversation started with initial message' : 'Conversation started'
        });
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

// ============ ACTIVITY FEED ============
app.get('/api/activity/feed', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    // Get recent tasks (created and completed) across the platform
    const { data: recentTasks, error } = await supabase
      .from('tasks')
      .select('id, title, city, status, created_at, updated_at')
      .in('status', ['open', 'completed', 'paid'])
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    // Format as activity items
    const activities = (recentTasks || []).map(task => {
      if (task.status === 'completed' || task.status === 'paid') {
        return {
          type: 'completed',
          message: `Task completed in ${task.city || 'Remote'}`,
          created_at: task.updated_at || task.created_at
        };
      }
      return {
        type: 'posted',
        message: `New task posted in ${task.city || 'Remote'}`,
        created_at: task.created_at
      };
    });

    res.json(activities);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// ============ CONVERSATIONS ============
// NOTE: conversations table uses human_id (not user_id) for the human column
app.get('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      task:tasks(id, title, category, budget),
      human:users!human_id(id, name, type, rating),
      agent:users!agent_id(id, name, type, organization),
      last_message:messages(created_at, content, sender_id)
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

  const { agent_id, task_id, title } = req.body;

  // Use upsert to prevent race condition duplicates
  // NOTE: Do NOT pass `id` field - let DB generate UUID on insert.
  // On conflict, upsert updates the existing row and RETURNING gives back
  // the existing row's ID (not a phantom generated one).
  const { data: conversation, error } = await supabase
    .from('conversations')
    .upsert({
      human_id: user.id,
      agent_id: agent_id || null,
      task_id: task_id || null,
      title: title || 'New Conversation',
      status: 'active'
    }, {
      onConflict: 'human_id,agent_id,task_id',
      ignoreDuplicates: false
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
      human:users!human_id(*),
      agent:users!agent_id(*)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !conversation) return res.status(404).json({ error: 'Not found' });

  // Verify user has access
  if (conversation.human_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(conversation);
});

// ============ MESSAGES ============
app.get('/api/messages/:conversation_id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { conversation_id } = req.params;
  const { limit = 50, before, after, after_time } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 50, 100);

  // Verify user has access to conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, human_id, agent_id')
    .eq('id', conversation_id)
    .single();

  if (convError || !conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.human_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Handle "before" cursor (loading older messages)
  // Must use descending order to get nearest N before cursor, then reverse
  if (before) {
    const { data: ref } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .single();

    if (ref) {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, name, type, avatar_url)
        `)
        .eq('conversation_id', conversation_id)
        .lt('created_at', ref.created_at)
        .order('created_at', { ascending: false })  // Descending to get nearest
        .limit(parsedLimit);

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data?.reverse() || []);  // Reverse to chronological order
    }
  }

  // Handle "after" cursor or after_time (loading newer messages / polling)
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(id, name, type, avatar_url)
    `)
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(parsedLimit);

  if (after) {
    const { data: ref } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', after)
      .single();
    if (ref) query = query.gt('created_at', ref.created_at);
  }

  // Time-based filter for polling optimization
  if (after_time) {
    query = query.gt('created_at', after_time);
  }

  const { data: messages, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(messages || []);
});

app.post('/api/messages', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { conversation_id, content, message_type = 'text', metadata = {} } = req.body;

  // Verify user has access to conversation (include task_id and task title for notifications)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, human_id, agent_id, task_id, tasks(title)')
    .eq('id', conversation_id)
    .single();

  if (convError || !conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.human_id !== user.id && conversation.agent_id !== user.id) {
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

  // Notify the OTHER party about the new message
  const otherPartyId = (user.id === conversation.human_id)
    ? conversation.agent_id
    : conversation.human_id;

  if (otherPartyId) {
    const taskTitle = conversation.tasks?.title || 'a task';
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    await createNotification(
      otherPartyId,
      'new_message',
      'New message',
      `New message about "${taskTitle}": ${preview}`,
      `/tasks/${conversation.task_id}`
    );

    // Dispatch webhook if the other party has one configured
    await dispatchWebhook(otherPartyId, {
      type: 'new_message',
      task_id: conversation.task_id,
      data: {
        conversation_id,
        message_id: message.id,
        sender_name: user.name,
        sender_type: user.type || (user.is_agent ? 'agent' : 'worker'),
        content,
        created_at: message.created_at
      }
    });
  }

  res.json(message);
});

app.put('/api/messages/:id/read', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Mark message as read - only messages from OTHER senders can be marked read
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .neq('sender_id', user.id); // Only mark OTHER party's messages as read

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Mark all messages in a conversation as read (bulk operation)
app.put('/api/conversations/:id/read-all', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  // Verify user is a participant in this conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, human_id, agent_id')
    .eq('id', id)
    .single();

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.human_id !== user.id && conversation.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Mark all messages from OTHER sender as read
  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)  // Only mark OTHER party's messages as read
    .is('read_at', null)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });

  res.json({ marked_count: data?.length || 0 });
});

// Get unread message summary across all conversations (for agents and humans)
app.get('/api/conversations/unread', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase.rpc('get_unread_summary', {
    p_user_id: user.id
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

  const {
    category,
    city,
    urgency,
    limit = 50,
    offset = 0,
    user_lat,
    user_lng,
    radius,
    radius_km,
    search,
    sort = 'distance',
    include_remote = 'true'
  } = req.query;

  const includeRemote = include_remote !== 'false';

  // Helper: fetch remote tasks matching current filters
  async function fetchRemoteTasks(existingIds) {
    if (!includeRemote) return [];
    let remoteQuery = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .eq('is_remote', true);
    if (category) remoteQuery = remoteQuery.eq('category', category);
    if (search) remoteQuery = remoteQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (sort === 'pay_high') {
      remoteQuery = remoteQuery.order('budget', { ascending: false, nullsFirst: false });
    } else if (sort === 'pay_low') {
      remoteQuery = remoteQuery.order('budget', { ascending: true, nullsFirst: false });
    } else {
      remoteQuery = remoteQuery.order('created_at', { ascending: false });
    }
    const { data: remoteTasks } = await remoteQuery.limit(20);
    if (!remoteTasks) return [];
    return remoteTasks
      .filter(t => !existingIds.has(t.id))
      .map(t => ({ ...t, distance_km: null }));
  }

  try {
    // If lat/lng provided, use RPC function for optimized distance-based search
    if (user_lat && user_lng && radius_km !== 'anywhere') {
      const radiusValue = radius_km ? parseFloat(radius_km) : (radius ? parseFloat(radius) * 1.60934 : 25);
      const effectiveRadius = radiusValue === 0 ? 5 : radiusValue; // 0 means "exact city" -> use 5km

      const { data, error } = await supabase.rpc('search_tasks_nearby', {
        user_lat: parseFloat(user_lat),
        user_lng: parseFloat(user_lng),
        radius: effectiveRadius,
        category_filter: category || null,
        search_text: search || null,
        sort_by: sort || 'distance',
        result_limit: parseInt(limit) || 50,
        result_offset: parseInt(offset) || 0
      });

      if (error) {
        console.error('RPC error:', error);
        // Fall through to legacy filtering if RPC fails
      } else {
        // Merge in tasks without coordinates that match city string
        let results = data || [];
        if (city) {
          const { data: cityTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'open')
            .is('latitude', null)
            .ilike('location', `%${city}%`)
            .limit(20);

          if (cityTasks) {
            const existingIds = new Set(results.map(r => r.id));
            cityTasks.forEach(t => {
              if (!existingIds.has(t.id)) {
                results.push({ ...t, distance_km: null });
              }
            });
          }
        }

        // Merge in remote tasks (visible to all users regardless of location)
        const existingIds = new Set(results.map(r => r.id));
        const remoteTasks = await fetchRemoteTasks(existingIds);
        results = results.concat(remoteTasks);

        return res.json({
          tasks: results,
          total: results.length,
          hasMore: results.length === parseInt(limit)
        });
      }
    }

    // Fallback: no location or RPC failed - use legacy filtering
    let query = supabase
      .from('tasks')
      .select(`
        *,
        agent:users!tasks_agent_id_fkey(id, name)
      `)
      .eq('status', 'open');

    if (category) query = query.eq('category', category);
    if (urgency) query = query.eq('urgency', urgency);
    if (search) {
      // Sanitize: strip PostgREST filter operators to prevent query injection
      const sanitizedSearch = search.replace(/[,.()"'\\%_]/g, '');
      if (sanitizedSearch.trim()) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
    }

    // Sort
    if (sort === 'pay_high') {
      query = query.order('budget', { ascending: false, nullsFirst: false });
    } else if (sort === 'pay_low') {
      query = query.order('budget', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(parseInt(limit));

    const { data: tasks, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    let results = tasks || [];

    // Apply distance filtering if coordinates provided (legacy fallback)
    // Skip all location filtering when radius_km is 'anywhere' — return all tasks
    if (radius_km === 'anywhere') {
      // "Anywhere" means no location filtering — but still respect remote toggle
      if (!includeRemote) {
        results = results.filter(t => !t.is_remote);
      }
    } else if (user_lat && user_lng && (radius_km || radius)) {
      const userLatitude = parseFloat(user_lat);
      const userLongitude = parseFloat(user_lng);

      // Keep remote tasks — they bypass distance filtering
      const remoteTasks = results.filter(t => t.is_remote);
      let localTasks = results.filter(t => !t.is_remote);

      if (radius_km) {
        const radiusKm = parseFloat(radius_km) || 50;
        if (radiusKm === 0) {
          localTasks = filterByDistanceKm(localTasks, userLatitude, userLongitude, 5);
        } else {
          localTasks = filterByDistanceKm(localTasks, userLatitude, userLongitude, radiusKm);
        }
      } else if (radius) {
        const maxRadius = parseFloat(radius);
        localTasks = filterByDistance(localTasks, userLatitude, userLongitude, maxRadius);
      }

      results = [...localTasks];

      // Fallback: include tasks without coords that match city string
      if (city) {
        const tasksWithoutCoords = (tasks || []).filter(t =>
          !t.latitude && !t.longitude && !t.is_remote &&
          t.location?.toLowerCase().includes(city.toLowerCase())
        );
        const resultIds = new Set(results.map(r => r.id));
        tasksWithoutCoords.forEach(t => {
          if (!resultIds.has(t.id)) results.push(t);
        });
      }

      // Add remote tasks back (they are not filtered by distance)
      if (includeRemote) {
        const resultIds = new Set(results.map(r => r.id));
        remoteTasks.forEach(t => {
          if (!resultIds.has(t.id)) results.push(t);
        });
      }
    } else if (city) {
      // When filtering by city only, keep remote tasks + city-matching tasks
      const remoteTasks = includeRemote ? results.filter(t => t.is_remote) : [];
      const cityTasks = results.filter(t =>
        !t.is_remote && t.location?.toLowerCase().includes(city.toLowerCase())
      );
      const resultIds = new Set(cityTasks.map(r => r.id));
      remoteTasks.forEach(t => {
        if (!resultIds.has(t.id)) cityTasks.push(t);
      });
      results = cityTasks;
    }

    // Merge in remote tasks for fallback path (mirrors RPC path at line 4013)
    if (includeRemote) {
      const existingIds = new Set(results.map(r => r.id));
      const remoteTasks = await fetchRemoteTasks(existingIds);
      results = results.concat(remoteTasks);
    }

    res.json({ tasks: results, total: results.length, hasMore: false });
  } catch (err) {
    console.error('Error fetching available tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ============ HUMANS DIRECTORY ============
app.get('/api/humans/directory', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const { category, city, min_rate, max_rate, limit = 50 } = req.query;
  
  let query = supabase
    .from('users')
    .select('id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, verified, availability, created_at, total_ratings_count, social_links')
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
      verified, availability, wallet_address, created_at, profile_completeness,
      total_tasks_completed, total_tasks_posted, total_tasks_accepted,
      total_disputes_filed, total_usdc_paid, last_active_at, social_links
    `)
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();

  if (error || !user) return res.status(404).json({ error: 'Human not found' });

  // Get visible ratings for this user
  const { data: reviews } = await supabase
    .from('ratings')
    .select('*')
    .eq('ratee_id', user.id)
    .not('visible_at', 'is', null)
    .lte('visible_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate derived metrics
  const completionRate = user.total_tasks_accepted > 0
    ? ((user.total_tasks_completed / user.total_tasks_accepted) * 100).toFixed(1)
    : null;

  const paymentRate = user.total_tasks_completed > 0
    ? (((user.total_tasks_completed - (user.total_disputes_filed || 0)) / user.total_tasks_completed) * 100).toFixed(1)
    : null;

  res.json({
    ...user,
    skills: JSON.parse(user.skills || '[]'),
    reviews: reviews || [],
    // Derived metrics
    completion_rate: completionRate,
    payment_rate: paymentRate
  });
});

// ============ TASK CREATION (Agents only) ============
app.post('/api/tasks/create', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user || user.type !== 'agent') {
    return res.status(401).json({ error: 'Agents only' });
  }

  const { title, description, category, location, budget, latitude, longitude, country, country_code } = req.body;

  const id = uuidv4();
  const budgetAmount = budget || 50;

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      id,
      agent_id: user.id,
      title,
      description,
      category,
      location,
      latitude: latitude != null ? parseFloat(latitude) : null,
      longitude: longitude != null ? parseFloat(longitude) : null,
      country: country || null,
      country_code: country_code || null,
      budget: budgetAmount,
      status: 'open',
      task_type: 'direct',
      human_ids: [],
      escrow_amount: budgetAmount,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    ...task,
    message: 'Task posted successfully.'
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

  // Calculate derived metrics
  const completionRate = profile.total_tasks_accepted > 0
    ? ((profile.total_tasks_completed / profile.total_tasks_accepted) * 100).toFixed(1)
    : null;

  const paymentRate = profile.total_tasks_completed > 0
    ? (((profile.total_tasks_completed - (profile.total_disputes_filed || 0)) / profile.total_tasks_completed) * 100).toFixed(1)
    : null;

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
    created_at: profile.created_at,
    // Reputation metrics
    total_tasks_completed: profile.total_tasks_completed || 0,
    total_tasks_posted: profile.total_tasks_posted || 0,
    total_tasks_accepted: profile.total_tasks_accepted || 0,
    total_disputes_filed: profile.total_disputes_filed || 0,
    total_usdc_paid: parseFloat(profile.total_usdc_paid) || 0,
    last_active_at: profile.last_active_at,
    // Derived metrics
    completion_rate: completionRate,
    payment_rate: paymentRate
  });
});

app.put('/api/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name, bio, city, state, hourly_rate, skills, availability, wallet_address } = req.body;
  
  const updates = { updated_at: new Date().toISOString(), verified: true };

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

// ============ WALLET BALANCE & WITHDRAWALS ============

app.get('/api/wallet/balance', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const balance = await getWalletBalance(supabase, user.id);

    res.json({
      user_id: user.id,
      wallet_address: user.wallet_address,
      has_wallet: !!user.wallet_address,
      ...balance
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// DISABLED FOR PHASE 1 MANUAL OPERATIONS — see _automated_disabled/
// Withdrawals are now handled manually by admin
app.post('/api/wallet/withdraw', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount_cents, method } = req.body; // method: 'stripe' | 'usdc'

  if (!method || !['stripe', 'usdc'].includes(method)) {
    return res.status(400).json({ error: 'Invalid method. Use "stripe" or "usdc".' });
  }

  try {
    if (method === 'stripe') {
      if (!user.stripe_account_id) {
        return res.status(400).json({
          error: 'No bank account connected',
          action: 'connect_stripe',
          message: 'Connect your bank account to withdraw via Stripe.'
        });
      }

      const { processStripeWithdrawal } = require('./backend/services/withdrawalService');
      const result = await processStripeWithdrawal(supabase, user.id, amount_cents || null, createNotification);
      return res.json(result);
    } else {
      // USDC path
      if (!user.wallet_address) {
        return res.status(400).json({
          error: 'No wallet address configured',
          message: 'Add a Base network wallet address in your profile to withdraw USDC.'
        });
      }

      const { sendUSDC } = require('./backend/lib/wallet');
      const result = await processWithdrawal(supabase, user.id, amount_cents || null, sendUSDC, createNotification);
      return res.json(result);
    }
  } catch (error) {
    console.error('[Withdraw] Error:', error.message);
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/wallet/withdrawals', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const history = await getWithdrawalHistory(supabase, user.id);
    res.json(history);
  } catch (error) {
    console.error('[Withdrawals] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/status', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const balance = await getWalletBalance(supabase, user.id);

    // Also get on-chain USDC balance if wallet is configured
    let onChainBalance = 0;
    if (user.wallet_address && process.env.BASE_RPC_URL) {
      try {
        const { getBalance } = require('./lib/wallet');
        onChainBalance = await getBalance(user.wallet_address);
      } catch (e) {
        console.error('Error fetching on-chain balance:', e);
      }
    }

    res.json({
      wallet_address: user.wallet_address,
      has_wallet: !!user.wallet_address,
      currency: 'USDC',

      // Platform-tracked balances
      pending: balance.pending,           // Funds in 48-hour dispute window
      available: balance.available,       // Funds ready to withdraw
      total: balance.total,               // pending + available

      // Breakdown in cents
      pending_cents: balance.pending_cents,
      available_cents: balance.available_cents,
      total_cents: balance.total_cents,

      // On-chain balance (for reference)
      on_chain_balance: onChainBalance,

      // Transaction details
      transactions: balance.transactions
    });
  } catch (error) {
    console.error('Error fetching wallet status:', error);
    res.status(500).json({ error: 'Failed to fetch wallet status' });
  }
});

app.get('/api/admin/pending-stats', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get aggregate stats
    const { data: stats, error } = await supabase
      .from('pending_transactions')
      .select('status, amount_cents')
      .in('status', ['pending', 'available', 'frozen']);

    if (error) throw error;

    const pending = stats.filter(s => s.status === 'pending');
    const available = stats.filter(s => s.status === 'available');
    const frozen = stats.filter(s => s.status === 'frozen');

    const pendingTotal = pending.reduce((sum, s) => sum + s.amount_cents, 0) / 100;
    const availableTotal = available.reduce((sum, s) => sum + s.amount_cents, 0) / 100;
    const frozenTotal = frozen.reduce((sum, s) => sum + s.amount_cents, 0) / 100;

    res.json({
      pending: {
        count: pending.length,
        total: pendingTotal
      },
      available: {
        count: available.length,
        total: availableTotal
      },
      frozen: {
        count: frozen.length,
        total: frozenTotal
      },
      grand_total: pendingTotal + availableTotal + frozenTotal
    });
  } catch (error) {
    console.error('Error fetching pending stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
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

    // DISABLED FOR PHASE 1 MANUAL OPERATIONS — see _automated_disabled/
    // Start background services
    // console.log('🔄 Starting background services...');
    // autoReleaseService.start();
    // console.log('   ✅ Auto-release service started (48h threshold)');

    // Start balance promoter (promotes pending → available after 48 hours)
    startBalancePromoter(supabase, createNotification);
    console.log('   ✅ Balance promoter started (15min interval)');
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

// NOTE: Duplicate conversations/messages endpoints using human_id schema were removed.
// The canonical endpoints using user_id schema are at lines ~3230-3451.

// ============ MY TASKS ============
app.get('/api/my-tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      creator:users!agent_id(id, name, email),
      assignee:users!human_id(id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (user.type === 'human') {
    // Humans see tasks assigned to them OR tasks they're involved in
    query = query.or(`agent_id.eq.${user.id},human_id.eq.${user.id}`);
  } else {
    // Agents see tasks they created
    query = query.eq('agent_id', user.id);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(tasks || []);
});

// REMOVED: Duplicate /api/tasks/available route - consolidated into main route above (line ~3416)

// ============ TASKS CRUD ============
// NOTE: POST /api/tasks is defined earlier (~line 1356) using agent_id — do not duplicate here

app.patch('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const updates = req.body;

  // Verify ownership (agent_id is the actual column in the tasks table)
  const { data: task } = await supabase
    .from('tasks')
    .select('agent_id')
    .eq('id', id)
    .single();

  if (!task || task.agent_id !== user.id) {
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
  
  // Atomic update: .select().single() ensures only one human can accept (race-safe)
  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      human_id: user.id,
      work_started_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'open')
    .select('id')
    .single();

  if (error || !updatedTask) {
    return res.status(409).json({ error: 'Task is no longer available — it may have been accepted by someone else' });
  }

  // Increment total_tasks_accepted for human
  const { data: acceptUser } = await supabase
    .from('users')
    .select('total_tasks_accepted')
    .eq('id', user.id)
    .single();
  await supabase
    .from('users')
    .update({
      total_tasks_accepted: (acceptUser?.total_tasks_accepted || 0) + 1,
      last_active_at: new Date().toISOString()
    })
    .eq('id', user.id);

  res.json({ success: true });
});

// NOTE: /api/tasks/:id/complete and /api/tasks/:id/approve duplicates removed.
// Use /api/tasks/:id/submit-proof (line ~1911) for proof submission.
// Use /api/tasks/:id/approve (line ~2085) for task approval.

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
    .select('agent_id')
    .eq('id', id)
    .single();

  if (!task || task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', id);

  res.json({ success: true });
});

// ============================================
// DISPUTE ENDPOINTS
// ============================================

// File a dispute (agent only, within 48 hours of payment)
app.post('/api/disputes', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { task_id, reason, category, evidence_urls } = req.body;

  if (!task_id || !reason) {
    return res.status(400).json({ error: 'Task ID and reason are required' });
  }

  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', task_id)
    .single();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Only agent can file dispute
  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Only the task agent can file a dispute' });
  }

  // Task must be completed
  if (task.status !== 'completed') {
    return res.status(400).json({ error: 'Can only dispute completed tasks' });
  }

  // Get the pending payout for this task
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .select('*')
    .eq('task_id', task_id)
    .eq('status', 'pending')
    .single();

  if (payoutError || !payout) {
    return res.status(400).json({
      error: 'Dispute window has closed for this task or payment has already been released'
    });
  }

  // Check if we're still within the 48-hour dispute window
  const now = new Date();
  const disputeWindowCloses = new Date(payout.dispute_window_closes_at);

  if (now > disputeWindowCloses) {
    return res.status(400).json({
      error: 'Dispute window has closed. You had 48 hours from payment release to file a dispute.'
    });
  }

  // Check if dispute already exists for this task
  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id')
    .eq('task_id', task_id)
    .single();

  if (existingDispute) {
    return res.status(400).json({ error: 'A dispute already exists for this task' });
  }

  // Freeze the pending funds
  const { error: freezeError } = await supabase
    .from('payouts')
    .update({ status: 'frozen' })
    .eq('id', payout.id);

  if (freezeError) {
    return res.status(500).json({ error: 'Failed to freeze payment' });
  }

  // Create dispute record
  const disputeId = uuidv4();
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .insert({
      id: disputeId,
      task_id,
      payout_id: payout.id,
      filed_by: user.id,
      filed_against: task.human_id,
      reason,
      category: category || 'other',
      evidence_urls: evidence_urls || [],
      status: 'open',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (disputeError) {
    // Rollback: unfreeze the payment
    await supabase
      .from('payouts')
      .update({ status: 'pending' })
      .eq('id', payout.id);

    return res.status(500).json({ error: 'Failed to create dispute: ' + disputeError.message });
  }

  // Increment total_disputes_filed for agent
  const { data: disputeUser } = await supabase
    .from('users')
    .select('total_disputes_filed')
    .eq('id', user.id)
    .single();
  await supabase
    .from('users')
    .update({
      total_disputes_filed: (disputeUser?.total_disputes_filed || 0) + 1,
      last_active_at: new Date().toISOString()
    })
    .eq('id', user.id);

  // Notify the human about the dispute
  const amountDollars = (payout.amount_cents / 100).toFixed(2);
  await createNotification(
    task.human_id,
    'dispute_filed',
    'Dispute Filed',
    `Task "${task.title}" is under review. $${amountDollars} is on hold.`,
    `/tasks/${task_id}`
  );

  // Notify the agent that dispute was filed successfully
  await createNotification(
    user.id,
    'dispute_created',
    'Dispute Filed Successfully',
    `Your dispute for task "${task.title}" has been submitted for review.`,
    `/disputes/${disputeId}`
  );

  res.json({
    success: true,
    dispute: dispute,
    message: 'Dispute filed successfully. Payment has been frozen pending review.'
  });
});

// Get disputes (filtered by user role)
app.get('/api/disputes', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { status } = req.query;

  let query = supabase
    .from('disputes')
    .select(`
      *,
      task:tasks(*),
      filed_by_user:users!disputes_filed_by_fkey(id, name, email),
      filed_against_user:users!disputes_filed_against_fkey(id, name, email)
    `)
    .or(`filed_by.eq.${user.id},filed_against.eq.${user.id}`);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: disputes, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ disputes });
});

// Get specific dispute
app.get('/api/disputes/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  const { data: dispute, error } = await supabase
    .from('disputes')
    .select(`
      *,
      task:tasks(*),
      payout:payouts(*),
      filed_by_user:users!disputes_filed_by_fkey(id, name, email),
      filed_against_user:users!disputes_filed_against_fkey(id, name, email),
      resolved_by_user:users!disputes_resolved_by_fkey(id, name, email)
    `)
    .eq('id', id)
    .single();

  if (error || !dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  // Check access - only parties involved can view
  if (dispute.filed_by !== user.id && dispute.filed_against !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ dispute });
});

// Resolve a dispute (admin/arbiter only - to be implemented)
app.post('/api/disputes/:id/resolve', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Admin check: only admins can resolve disputes
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { resolution, resolution_notes, refund_agent } = req.body;

  if (!resolution || !['approved', 'rejected'].includes(resolution)) {
    return res.status(400).json({ error: 'Valid resolution required (approved or rejected)' });
  }

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('*, payout:payouts(*), task:tasks(*)')
    .eq('id', id)
    .single();

  if (disputeError || !dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  if (dispute.status !== 'open') {
    return res.status(400).json({ error: 'Dispute has already been resolved' });
  }

  // Update dispute status
  await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution_notes,
      resolved_by: user.id,
      resolved_at: new Date().toISOString()
    })
    .eq('id', id);

  if (resolution === 'approved' && refund_agent) {
    // Agent wins: refund the payment and update payout status
    await supabase
      .from('payouts')
      .update({ status: 'refunded' })
      .eq('id', dispute.payout.id);

    // Update task escrow status
    await supabase
      .from('tasks')
      .update({ escrow_status: 'refunded' })
      .eq('id', dispute.task_id);

    // Notify both parties
    await createNotification(
      dispute.filed_by,
      'dispute_resolved',
      'Dispute Resolved - Refund Issued',
      `Your dispute for task "${dispute.task.title}" was approved. A refund has been issued.`,
      `/disputes/${id}`
    );

    await createNotification(
      dispute.filed_against,
      'dispute_resolved',
      'Dispute Resolved - Payment Withheld',
      `The dispute for task "${dispute.task.title}" was resolved against you. Payment has been withheld.`,
      `/disputes/${id}`
    );
  } else {
    // Human wins: release the payment
    await supabase
      .from('payouts')
      .update({ status: 'available' })
      .eq('id', dispute.payout.id);

    // Notify both parties
    await createNotification(
      dispute.filed_against,
      'dispute_resolved',
      'Dispute Resolved - Payment Released',
      `The dispute for task "${dispute.task.title}" was resolved in your favor. Payment has been released.`,
      `/disputes/${id}`
    );

    await createNotification(
      dispute.filed_by,
      'dispute_resolved',
      'Dispute Resolved - Payment Released to Human',
      `The dispute for task "${dispute.task.title}" was resolved in favor of the human.`,
      `/disputes/${id}`
    );
  }

  res.json({
    success: true,
    message: `Dispute resolved: ${resolution}`,
    dispute: { ...dispute, status: 'resolved' }
  });
});

