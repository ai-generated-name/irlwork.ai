// =========================================================================
// irlwork.ai API Server
// =========================================================================
// Reference documentation (repo root):
// ARCHITECTURE.md     — Status machine, payment flows, cancellation policy, notifications
// BRAND_GUIDELINES.md — Colors, typography, component patterns, anti-patterns
// API_REFERENCE.md    — Endpoint schemas, auth, webhooks
// DATABASE_SCHEMA.md  — Table definitions, relationships
// DEVELOPMENT.md      — Getting started, project structure
//
// IMPORTANT: Any changes to endpoints, status transitions, payment flows,
// or notifications must be reflected in the corresponding reference doc.
// =========================================================================
console.log('[Startup] Loading environment...');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Structured logging (Pino) — import early so all modules can use it
const logger = require('./lib/logger');

// Sentry error tracking — import before Express for instrumentation
const { initSentry, sentryErrorHandler, captureException } = require('./lib/sentry');

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  captureException(err, { tags: { type: 'uncaughtException' } });
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Rejection');
  captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { type: 'unhandledRejection' },
  });
});

logger.info('Loading modules...');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 12;

// Wallet address validation (Ethereum/Base network - 0x + 40 hex chars)
const isValidWalletAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

// Sanitize error messages for client responses — never leak database internals
function safeErrorMessage(error) {
  const msg = error?.message || 'Unknown error';
  // Block database/SQL error patterns from reaching clients
  if (/duplicate key|violates.*constraint|relation.*does not exist|column.*does not exist|syntax error|PGRES|permission denied|supabase/i.test(msg)) {
    return 'An internal error occurred';
  }
  return msg;
}

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
const initSubscriptionRoutes = require('./routes/subscription');

// Notification services
console.log('[Startup] Loading notification services...');
const { createEmailService } = require('./lib/notifications/emailService');
const { createNotificationService } = require('./lib/notifications/notificationService');
const initNotificationRoutes = require('./routes/notifications');

// Validation & schema routes
console.log('[Startup] Loading validation system...');
const initSchemaRoutes = require('./routes/schemas');
const initTaskValidationRoutes = require('./routes/tasks-validation');
const { flushTaskTypeCache } = require('./lib/validation/pipeline');
const { runTaskValidation } = require('./lib/validation/task-creation-helper');
const { encrypt: encryptField } = require('./services/encryption');

// Distance calculation utilities
console.log('[Startup] Loading utils...');
const { haversineDistance, filterByDistance, filterByDistanceKm } = require('./utils/distance');
const { find: findTimezone } = require('geo-tz');

// Cities data for autocomplete search (loaded once at startup)
console.log('[Startup] Loading cities data...');
const citiesRaw = require('cities.json');
const admin1Raw = require('cities.json/admin1.json');

const COUNTRY_NAMES = {
  'US': 'USA', 'GB': 'UK', 'CA': 'Canada', 'AU': 'Australia', 'NZ': 'New Zealand',
  'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'JP': 'Japan',
  'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina',
  'ZA': 'South Africa', 'NG': 'Nigeria', 'EG': 'Egypt', 'KE': 'Kenya',
  'NL': 'Netherlands', 'BE': 'Belgium', 'SE': 'Sweden', 'NO': 'Norway',
  'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'RU': 'Russia', 'UA': 'Ukraine',
  'TR': 'Turkey', 'SA': 'Saudi Arabia', 'AE': 'UAE', 'IL': 'Israel',
  'SG': 'Singapore', 'MY': 'Malaysia', 'TH': 'Thailand', 'PH': 'Philippines',
  'ID': 'Indonesia', 'VN': 'Vietnam', 'KR': 'South Korea', 'PK': 'Pakistan',
  'BD': 'Bangladesh', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru',
  'VE': 'Venezuela', 'PT': 'Portugal', 'GR': 'Greece', 'CZ': 'Czech Republic',
  'AT': 'Austria', 'CH': 'Switzerland', 'IE': 'Ireland'
};
const COUNTRIES_WITH_STATES = ['US', 'CA', 'AU'];

// Build admin1 lookup map
const admin1Map = new Map();
admin1Raw.forEach(a => admin1Map.set(a.code, a.name));

// Pre-process cities into searchable objects
const citiesIndex = citiesRaw.map(city => {
  const countryCode = city.country;
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  let stateName = null;
  let stateCode = null;
  if (COUNTRIES_WITH_STATES.includes(countryCode) && city.admin1) {
    stateName = admin1Map.get(`${countryCode}.${city.admin1}`) || null;
    stateCode = city.admin1;
  }
  const displayName = stateName
    ? `${city.name}, ${stateName}, ${countryName}`
    : `${city.name}, ${countryName}`;

  return {
    name: city.name,
    nameLower: city.name.toLowerCase(),
    country: countryName,
    countryLower: countryName.toLowerCase(),
    countryCode,
    state: stateName,
    stateCode,
    lat: parseFloat(city.lat),
    lng: parseFloat(city.lng),
    displayName
  };
});
console.log(`[Startup] Cities index built: ${citiesIndex.length} cities`);

// Build unique countries list for country search endpoint
const countriesMap = new Map();
citiesIndex.forEach(city => {
  if (!countriesMap.has(city.countryCode)) {
    countriesMap.set(city.countryCode, { name: city.country, code: city.countryCode });
  }
});
const countriesList = Array.from(countriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
console.log(`[Startup] Countries list built: ${countriesList.length} countries`);

// Phase 1 Admin Routes
console.log('[Startup] Loading admin routes...');
const initAdminRoutes = require('./routes/admin');
console.log('[Startup] All modules loaded');

// Configuration
const app = express();

// Initialize Sentry BEFORE all other middleware (required for request instrumentation)
initSentry(app);

const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Request logging middleware — assigns request ID and logs request/response
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  const start = Date.now();

  // Skip noisy health check logs
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      req_id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id || null,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, `${req.method} ${req.path} ${res.statusCode}`);
    } else if (res.statusCode >= 400) {
      logger.warn(logData, `${req.method} ${req.path} ${res.statusCode}`);
    } else {
      logger.info(logData, `${req.method} ${req.path} ${res.statusCode}`);
    }
  });

  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.supabase.co", "https://api.resend.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration — production origins are always included
const PRODUCTION_ORIGINS = [
  'https://www.irlwork.ai',
  'https://irlwork.ai',
  'https://api.irlwork.ai'
];
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];
const corsOrigins = [...new Set([...PRODUCTION_ORIGINS, ...envOrigins])];

console.log('[CORS] Configured origins:', corsOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Block null origin (sandboxed iframes) and requests with no origin
    // except server-to-server calls which legitimately have no origin
    if (!origin) {
      // Allow server-to-server (no origin) but block 'null' origin
      return callback(null, true);
    }
    if (origin === 'null') {
      return callback(new Error('Null origin not allowed'));
    }

    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(500).json({ error: 'Webhook verification not configured' });
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
      logger.error({ err, event_type: event.type, event_id: event.id }, 'Stripe webhook processing error');
      captureException(err, {
        tags: { service: 'stripe', webhook_event: event.type },
        extra: { event_id: event.id },
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

app.use(express.json({ limit: '5mb' }));

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

// Helper: build task insert/update data, only including optional columns that exist in DB
function buildTaskInsertData(baseData, optionalFields = {}) {
  const data = { ...baseData };
  // Strip optional columns that don't exist in the schema
  if (!taskColumnFlags.spots_filled) delete data.spots_filled;
  if (!taskColumnFlags.is_anonymous) delete data.is_anonymous;
  if (!taskColumnFlags.duration_hours) delete data.duration_hours;
  if (!taskColumnFlags.task_type_id) delete data.task_type_id;
  if (!taskColumnFlags.location_zone) delete data.location_zone;
  if (!taskColumnFlags.private_address) delete data.private_address;
  if (!taskColumnFlags.private_notes) delete data.private_notes;
  if (!taskColumnFlags.private_contact) delete data.private_contact;
  if (!taskColumnFlags.validation_attempts) delete data.validation_attempts;
  // Add optional fields only if column exists
  if (taskColumnFlags.spots_filled && optionalFields.spots_filled !== undefined) {
    data.spots_filled = optionalFields.spots_filled;
  }
  if (taskColumnFlags.is_anonymous && optionalFields.is_anonymous !== undefined) {
    data.is_anonymous = optionalFields.is_anonymous;
  }
  if (taskColumnFlags.duration_hours && optionalFields.duration_hours !== undefined) {
    data.duration_hours = optionalFields.duration_hours;
  }
  return data;
}

// Helper: clean task update data by removing non-existent optional columns
function cleanTaskData(data) {
  const cleaned = { ...data };
  if (!taskColumnFlags.spots_filled) delete cleaned.spots_filled;
  if (!taskColumnFlags.is_anonymous) delete cleaned.is_anonymous;
  if (!taskColumnFlags.duration_hours) delete cleaned.duration_hours;
  if (!taskColumnFlags.review_deadline) delete cleaned.review_deadline;
  if (!taskColumnFlags.escrow_captured) delete cleaned.escrow_captured;
  if (!taskColumnFlags.auth_hold_expires_at) delete cleaned.auth_hold_expires_at;
  if (!taskColumnFlags.rejection_feedback) delete cleaned.rejection_feedback;
  if (!taskColumnFlags.auto_approved) delete cleaned.auto_approved;
  if (!taskColumnFlags.revision_count) delete cleaned.revision_count;
  if (!taskColumnFlags.deadline_warning_sent) delete cleaned.deadline_warning_sent;
  if (!taskColumnFlags.instructions_attachments) delete cleaned.instructions_attachments;
  if (!taskColumnFlags.task_type_id) delete cleaned.task_type_id;
  if (!taskColumnFlags.location_zone) delete cleaned.location_zone;
  if (!taskColumnFlags.validation_attempts) delete cleaned.validation_attempts;
  if (!taskColumnFlags.cancelled_at) delete cleaned.cancelled_at;
  if (!taskColumnFlags.cancellation_reason) delete cleaned.cancellation_reason;
  // Always strip private fields from public responses
  delete cleaned.private_address;
  delete cleaned.private_notes;
  delete cleaned.private_contact;
  return cleaned;
}

const { stripPrivateFields } = require('./lib/privacy/strip-private-fields');

// Configuration
const { PLATFORM_FEE_PERCENT } = require('./config/constants');
const { getTierConfig, calculateWorkerFee, calculatePosterFee, canPostTask } = require('./config/tiers');
const { isAdmin } = require('./middleware/adminAuth');

// File upload validation
const ALLOWED_UPLOAD_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'pdf'];
const ALLOWED_UPLOAD_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'application/pdf'
];

// Magic byte signatures for file type validation
const MAGIC_BYTES = {
  'jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'webp': null, // Checked via RIFF header below
  'pdf': [Buffer.from('%PDF')],
  'mp4': null, // Checked via ftyp box below
  'mov': null, // Checked via ftyp/moov below
};

function validateUploadFile(filename, mimeType, fileBuffer) {
  const ext = (filename?.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_UPLOAD_EXTS.includes(ext)) {
    return { valid: false, error: `File type .${ext} not allowed. Accepted: ${ALLOWED_UPLOAD_EXTS.join(', ')}` };
  }
  if (mimeType && !ALLOWED_UPLOAD_MIMES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: `MIME type ${mimeType} not allowed` };
  }

  // Validate magic bytes if file buffer is provided
  if (fileBuffer && fileBuffer.length >= 12) {
    const magicSigs = MAGIC_BYTES[ext];
    if (magicSigs) {
      const matches = magicSigs.some(sig => fileBuffer.subarray(0, sig.length).equals(sig));
      if (!matches) {
        return { valid: false, error: `File content does not match expected .${ext} format` };
      }
    } else if (ext === 'webp') {
      // RIFF....WEBP
      if (fileBuffer.subarray(0, 4).toString() !== 'RIFF' || fileBuffer.subarray(8, 12).toString() !== 'WEBP') {
        return { valid: false, error: 'File content does not match expected .webp format' };
      }
    } else if (ext === 'mp4' || ext === 'mov') {
      // Check for ftyp or moov box in first 12 bytes
      const boxType = fileBuffer.subarray(4, 8).toString();
      if (!['ftyp', 'moov', 'free', 'mdat'].includes(boxType)) {
        return { valid: false, error: `File content does not match expected .${ext} format` };
      }
    }
  }

  return { valid: true, ext };
}

// Task status transition validation
const VALID_STATUS_TRANSITIONS = {
  open: ['pending_acceptance', 'assigned', 'expired', 'cancelled'],
  pending_acceptance: ['assigned', 'open', 'cancelled'],
  assigned: ['in_progress', 'cancelled', 'open'],
  in_progress: ['pending_review', 'disputed', 'open'],
  pending_review: ['approved', 'in_progress', 'disputed'],
  approved: ['paid'],
  disputed: ['approved', 'cancelled', 'paid'],
  paid: [],
  expired: [],
  cancelled: [],
};

function validateStatusTransition(currentStatus, newStatus) {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return { valid: false, error: `Cannot transition from '${currentStatus}' to '${newStatus}'` };
  }
  return { valid: true };
}

// Escape SQL LIKE wildcards (% and _) to prevent wildcard injection
function escapeLike(s) { return s.replace(/[%_\\]/g, '\\$&'); }

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

// Safely parse a JSONB column value that may be a JS array (from JSONB) or a string (double-encoded)
function safeParseJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
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
  const isAuthenticated = req.headers.authorization?.includes('irl_sk_') || req.headers.authorization?.startsWith('Bearer ');
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

// ============ PER-CONVERSATION MESSAGE RATE LIMITING ============
// Prevents message spam: max 30 messages per minute per user per conversation
const messageRateLimitStore = new Map();
const MESSAGE_RATE_LIMIT = { maxMessages: 30, windowMs: 60 * 1000 };

function checkMessageRateLimit(userId, conversationId) {
  const key = `${userId}:${conversationId}`;
  const now = Date.now();
  let record = messageRateLimitStore.get(key);

  if (record && now - record.windowStart > MESSAGE_RATE_LIMIT.windowMs) {
    record = null;
  }

  if (!record) {
    record = { count: 0, windowStart: now };
    messageRateLimitStore.set(key, record);
  }

  record.count++;

  if (record.count > MESSAGE_RATE_LIMIT.maxMessages) {
    const resetAt = new Date(record.windowStart + MESSAGE_RATE_LIMIT.windowMs);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((resetAt.getTime() - now) / 1000)
    };
  }

  return { allowed: true };
}

// Clean up message rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of messageRateLimitStore.entries()) {
    if (now - record.windowStart > 5 * 60 * 1000) {
      messageRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Build the correct avatar URL for a user, using the API proxy endpoint.
 * This ensures avatars always work regardless of R2 public URL configuration.
 */
function getAvatarUrl(user, req) {
  if (!user || !user.avatar_r2_key) return user?.avatar_url || '';
  // If avatar_url already points to our proxy with a cache-buster, use it as-is
  // This ensures the URL matches what the upload endpoint returned to the client
  if (user.avatar_url && user.avatar_url.includes('/api/avatar/') && user.avatar_url.includes('?v=')) {
    return user.avatar_url;
  }
  // Otherwise, construct a proxy URL with cache-buster from updated_at
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return user.avatar_url || '';
  const cacheBuster = user.updated_at ? new Date(user.updated_at).getTime() : Date.now();
  return `${protocol}://${host}/api/avatar/${user.id}?v=${cacheBuster}`;
}

/**
 * Authenticate a request by token.
 *
 * Authentication is checked in order of preference:
 * 1. Supabase JWT (access_token from supabase.auth.getSession) — most secure
 * 2. UUID (legacy fallback — being phased out)
 * 3. API key (irl_sk_... format for programmatic access)
 * 4. Legacy API key in users table
 */
// Core columns guaranteed to exist in the users table (from base migration.sql)
const USER_CORE_COLUMNS = 'id, email, password_hash, name, type, api_key, avatar_url, bio, hourly_rate, account_type, city, state, service_radius, skills, social_links, profile_completeness, availability, rating, jobs_completed, verified, wallet_address, stripe_account_id, created_at, updated_at';

// Optional columns added by migrations — checked at startup and only included if they exist
const USER_OPTIONAL_COLUMNS = [
  // Columns that may or may not exist depending on migrations
  'zip', 'professional_category', 'license_number', 'certification_url',
  'insurance_provider', 'insurance_expiry', 'portfolio_url',
  'review_count', 'wallet_chain',
  'travel_radius', 'needs_onboarding', 'languages', 'headline', 'timezone',
  'country', 'country_code', 'latitude', 'longitude',
  'total_tasks_completed', 'total_tasks_posted', 'total_tasks_accepted',
  'total_disputes_filed', 'total_paid', 'last_active_at',
  'onboarding_completed_at', 'role', 'agent_name', 'webhook_url',
  'stripe_customer_id', 'stripe_onboarding_complete',
  'avatar_data', 'avatar_r2_key', 'phone',
  'email_verified_at', 'deposit_address', 'notification_preferences',
  'subscription_tier', 'subscription_status',
  'subscription_current_period_end', 'subscription_cancel_at_period_end',
  'gender'
];

// Built dynamically at startup by checkUserColumns()
let USER_SELECT_COLUMNS = USER_CORE_COLUMNS;

async function checkUserColumns() {
  if (!supabase) return;
  const verified = [];
  for (const col of USER_OPTIONAL_COLUMNS) {
    const { error } = await supabase.from('users').select(col).limit(1);
    if (!error) {
      verified.push(col);
    } else {
      console.log(`[Schema] Column 'users.${col}' not found — will be excluded from queries.`);
    }
  }
  USER_SELECT_COLUMNS = USER_CORE_COLUMNS + (verified.length > 0 ? ', ' + verified.join(', ') : '');
  console.log(`[Schema] User columns: ${USER_CORE_COLUMNS.split(', ').length} core + ${verified.length} optional`);
}

async function getUserByToken(token) {
  if (!token || !supabase) return null;

  // Remove "Bearer " prefix if present
  const cleanToken = token.replace(/^Bearer\s+/i, '');

  // 1. Try Supabase JWT verification (preferred auth method)
  // JWTs are not UUIDs and not API keys, so try JWT first for non-UUID, non-API-key tokens
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(cleanToken) && !cleanToken.startsWith('irl_sk_')) {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(cleanToken);
      if (error) {
        console.error('[getUserByToken] JWT verify error:', error.message);
      }
      if (authUser && !error) {
        // JWT verified — look up user in our DB by Supabase auth user ID
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select(USER_SELECT_COLUMNS)
          .eq('id', authUser.id)
          .single();
        if (dbError) {
          console.error('[getUserByToken] DB lookup by ID error:', dbError.message, 'for authUser.id:', authUser.id);
        }
        if (dbUser) return dbUser;

        // Fall back to email lookup (handles ID mismatch from OAuth)
        if (authUser.email) {
          const { data: byEmail, error: emailError } = await supabase
            .from('users')
            .select(USER_SELECT_COLUMNS)
            .eq('email', authUser.email)
            .single();
          if (emailError) {
            console.error('[getUserByToken] DB lookup by email error:', emailError.message, 'for email:', authUser.email);
          }
          if (byEmail) return byEmail;
        }
        console.error('[getUserByToken] JWT valid but no DB user found. authUser.id:', authUser.id, 'email:', authUser.email);
      }
    } catch (e) {
      console.error('[getUserByToken] JWT verification exception:', e.message);
      // JWT verification failed — continue to other auth methods
    }
  }

  // 2. UUID tokens are no longer accepted as authentication.
  // Clients must use Supabase JWT or API key (irl_sk_...).
  if (uuidRegex.test(cleanToken)) {
    return null;
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
        .select(USER_SELECT_COLUMNS)
        .eq('id', apiKeyRecord.user_id)
        .single();
      return user;
    }
    return null;
  }

  // Legacy plaintext API key lookup removed for security.
  // All API keys must use the irl_sk_ format with HMAC hashing.
  return null;
}

// Notification services (initialized after supabase, used by createNotification)
let _emailService = null;
let _notificationService = null;

async function createNotification(userId, type, title, message, link = null) {
  if (_notificationService) {
    try {
      await _notificationService.notify(userId, type, title, message, link);
      return;
    } catch (err) {
      console.error('[Notification] Service error, falling back to direct insert:', err.message);
    }
  }
  // Fallback: direct DB insert (when service not initialized or on error)
  if (!supabase) return;
  try {
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type,
      title,
      message,
      link
    });
  } catch (e) { /* swallow to match original behavior */ }
}

// sendMessageEmailNotification — REMOVED: email is now handled by the notification service pipeline.
// The createNotification() call for 'new_message' events triggers email via notificationService.notify().

// Generic email notification helper for lifecycle events
async function sendEmailNotification(recipientUserId, subject, bodyHtml) {
  if (!supabase) return;
  try {
    const { data: recipient } = await supabase
      .from('users')
      .select('email, name, notification_preferences')
      .eq('id', recipientUserId)
      .single();
    if (!recipient?.email) return;
    const prefs = recipient.notification_preferences || {};
    if (prefs.email_notifications === false) return;
    const cacheKey = `email_throttle_global_${recipientUserId}`;
    if (global._emailThrottle?.[cacheKey]) {
      const elapsed = Date.now() - global._emailThrottle[cacheKey];
      if (elapsed < 60 * 1000) return;
    }
    if (!global._emailThrottle) global._emailThrottle = {};
    global._emailThrottle[cacheKey] = Date.now();
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.log(`[Email] Would notify ${recipient.email}: ${subject}`);
      return;
    }
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'IRL Work <notifications@irlwork.ai>',
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            ${bodyHtml}
            <p style="font-size: 11px; color: #B0B0B0; margin-top: 24px;">You received this because you have notifications enabled on IRL Work.</p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error('[Email] Failed to send notification:', err.message);
  }
}

// Dispatch webhook to user if they have one configured
// Enqueues to webhook_deliveries table for reliable delivery
async function dispatchWebhook(userId, event) {
  if (!supabase) return;
  try {
    const payload = {
      event_type: event.type,
      task_id: event.task_id,
      data: event.data,
      timestamp: new Date().toISOString()
    };
    const { error: insertErr } = await supabase
      .from('webhook_deliveries')
      .insert({
        user_id: userId,
        event_type: event.type || 'unknown',
        payload: payload,
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
        next_retry_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    if (insertErr) {
      console.warn(`[WEBHOOK] Queue insert failed (${insertErr.message}), falling back to direct`);
      await deliverWebhookDirect(userId, payload);
    }
  } catch (err) {
    console.error(`Webhook enqueue failed for user ${userId}:`, err.message);
  }
}

// Direct webhook delivery fallback (used when queue insert fails)
async function deliverWebhookDirect(agentId, payload) {
  if (!supabase) return;
  const { data: agent } = await supabase
    .from('users')
    .select('webhook_url, webhook_secret')
    .eq('id', agentId)
    .single();
  if (!agent?.webhook_url) return;
  const webhookUrl = agent.webhook_url;
  const headers = { 'Content-Type': 'application/json' };
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

  const subscriptionRoutes = initSubscriptionRoutes(supabase, getUserByToken, createNotification);
  app.use('/api/subscription', subscriptionRoutes);
  console.log('[Startup] Subscription routes mounted at /api/subscription');
}

// (Subscription routes already mounted above with Stripe routes)

// ============ NOTIFICATION ROUTES ============
if (supabase) {
  _emailService = createEmailService(supabase);
  _notificationService = createNotificationService(supabase, _emailService);
  const notificationRoutes = initNotificationRoutes(supabase, getUserByToken, _notificationService);
  app.use('/api/notifications', notificationRoutes);
  console.log('[Startup] Notification routes mounted at /api/notifications');
}

// ============ TASK VALIDATION & SCHEMA ROUTES ============
if (supabase) {
  const schemaRoutes = initSchemaRoutes(supabase);
  app.use('/api/schemas', schemaRoutes);
  console.log('[Startup] Schema routes mounted at /api/schemas');

  // Mount BEFORE existing /api/tasks routes so /api/tasks/validate matches first
  const taskValidationRoutes = initTaskValidationRoutes(supabase, getUserByToken);
  app.use('/api/tasks', taskValidationRoutes);
  console.log('[Startup] Task validation routes mounted at /api/tasks');
}

// ============ MCP DOCS ROUTE ============
// Public endpoint — no auth required. Agents fetch method docs at runtime.
const mcpDocsRoutes = require('./routes/mcp-docs');
app.use('/api/mcp', mcpDocsRoutes);
console.log('[Startup] MCP docs route mounted at /api/mcp/docs');

// ============ CITY SEARCH ============
// Public endpoint — no auth required, no Supabase needed
app.get('/api/cities/search', (req, res) => {
  const { q, limit: limitStr } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }

  const limit = Math.min(Math.max(parseInt(limitStr) || 10, 1), 20);
  const lowerQuery = q.toLowerCase();

  const matches = [];
  for (let i = 0; i < citiesIndex.length && matches.length < limit; i++) {
    const city = citiesIndex[i];
    if (city.nameLower.includes(lowerQuery) || city.countryLower.includes(lowerQuery)) {
      matches.push({
        name: city.name,
        country: city.country,
        countryCode: city.countryCode,
        state: city.state,
        stateCode: city.stateCode,
        lat: city.lat,
        lng: city.lng,
        displayName: city.displayName
      });
    }
  }

  res.json(matches);
});

// ============ COUNTRY SEARCH ============
// Public endpoint — no auth required, no Supabase needed
app.get('/api/countries/search', (req, res) => {
  const { q, limit: limitStr } = req.query;
  const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 50);

  if (!q || q.length < 1) {
    return res.json(countriesList.slice(0, limit));
  }

  const lowerQuery = q.toLowerCase();
  const matches = [];
  for (let i = 0; i < countriesList.length && matches.length < limit; i++) {
    const country = countriesList[i];
    if (country.name.toLowerCase().includes(lowerQuery) || country.code.toLowerCase().includes(lowerQuery)) {
      matches.push(country);
    }
  }

  res.json(matches);
});

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
      .select(USER_SELECT_COLUMNS)
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
          .select(USER_SELECT_COLUMNS)
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
            .select(USER_SELECT_COLUMNS)
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
    
    // Seed default notification preferences for new user
    if (_notificationService) {
      _notificationService.seedDefaultPreferences(id).catch(err => {
        console.error('[Registration] Failed to seed notification preferences:', err.message);
      });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { email, password } = req.body;

  // Brute force protection: 10 attempts per 15 minutes per IP
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const rateCheck = await checkRateLimit(ipHash, 'login', 10, 15);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.', retry_after: rateCheck.resetAt });
  }

  // Fetch user by email (bcrypt hashes are non-deterministic, can't use .eq() for comparison)
  const { data: user, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
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

  // Return email_verified status
  const email_verified = !!user.email_verified_at;

  res.json({
    user: { id: user.id, email: user.email, name: user.name, type: user.type, email_verified },
    token: crypto.randomBytes(32).toString('hex')
  });
});

// ============ GOOGLE OAUTH ============
// Redirect to Supabase Google OAuth
app.get('/api/auth/google', (req, res) => {
  if (!supabaseUrl) return res.status(500).json({ error: 'Supabase not configured' });

  // Only use environment variable for redirect — never accept from query params (open redirect risk)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const callbackUrl = `${frontendUrl}/api/auth/google/callback`;
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}`;
  res.redirect(authUrl);
});

// Google OAuth callback - Supabase redirects here after auth
app.get('/api/auth/google/callback', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  // Only use environment variable for redirect — never accept from query params
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
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
      .select(USER_SELECT_COLUMNS)
      .eq('email', email)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }
    
    if (!existingUser) {
      // Create new user — use Supabase auth UUID so fetchUserProfile can find them by supabaseUser.id
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email,
          name,
          type: 'human',
          account_type: 'human',
          verified: true,
          avatar_url: user.user_metadata?.avatar_url || null,
          profile_completeness: 0.5,
          availability: 'available',
          rating: 0,
          jobs_completed: 0,
          created_at: new Date().toISOString()
        })
        .select(USER_SELECT_COLUMNS)
        .single();

      if (createError) throw createError;
      existingUser = newUser;

      // Seed default notification preferences for new Google OAuth user
      if (_notificationService && newUser?.id) {
        _notificationService.seedDefaultPreferences(newUser.id).catch(err => {
          console.error('[OAuth] Failed to seed notification preferences:', err.message);
        });
      }
    } else if (!existingUser.type || existingUser.type !== 'human') {
      // Existing user but type not set — update to ensure they appear in browse
      await supabase
        .from('users')
        .update({ type: 'human', account_type: 'human', verified: true })
        .eq('id', existingUser.id);
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

  // Check admin status via ADMIN_USER_IDS env var
  // TODO: Migrate admin auth from env var to users.role database column for easier management
  const adminUserIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const userIsAdmin = adminUserIds.includes(user.id);

  res.json({
    user: {
      id: user.id, email: user.email, name: user.name, type: user.type,
      is_admin: userIsAdmin,
      city: user.city, hourly_rate: user.hourly_rate,
      bio: user.bio || '',
      avatar_url: getAvatarUrl(user, req),
      travel_radius: user.travel_radius || 25,
      latitude: user.latitude,
      longitude: user.longitude,
      country: user.country,
      country_code: user.country_code,
      deposit_address: user.deposit_address,
      skills: safeParseJsonArray(user.skills),
      social_links: user.social_links || {},
      languages: safeParseJsonArray(user.languages),
      profile_completeness: user.profile_completeness,
      needs_onboarding: needsOnboarding,
      verified: user.verified,
      email_verified: !!user.email_verified_at,
      // Reputation metrics
      total_tasks_completed: user.total_tasks_completed || 0,
      total_tasks_posted: user.total_tasks_posted || 0,
      total_tasks_accepted: user.total_tasks_accepted || 0,
      total_disputes_filed: user.total_disputes_filed || 0,
      total_paid: parseFloat(user.total_paid) || 0,
      last_active_at: user.last_active_at,
      // Derived metrics
      completion_rate: completionRate,
      payment_rate: paymentRate,
      jobs_completed: user.jobs_completed || 0,
      created_at: user.created_at,
      headline: user.headline || '',
      timezone: user.timezone || '',
      ...(userHasGenderColumn ? { gender: user.gender || null } : {}),
      availability: user.availability || 'available',
      // Subscription
      subscription_tier: user.subscription_tier || 'free',
      subscription_status: user.subscription_status || 'inactive',
      subscription_current_period_end: user.subscription_current_period_end || null,
      subscription_cancel_at_period_end: user.subscription_cancel_at_period_end || false,
      tasks_posted_this_month: user.tasks_posted_this_month || 0,
    }
  });
});

// POST /api/auth/onboard - Idempotent onboarding completion
// Creates user if doesn't exist, updates if exists
// Always sets needs_onboarding: false and onboarding_completed_at
app.post('/api/auth/onboard', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Validate the user via token authentication (JWT or API key only).
  const authenticatedUser = await getUserByToken(req.headers.authorization);
  if (!authenticatedUser) {
    return res.status(401).json({ error: 'Invalid or missing authentication' });
  }
  const userId = authenticatedUser.id;

  const { email, name, city, latitude, longitude, country, country_code,
          hourly_rate, skills, travel_radius, role, bio, avatar_url } = req.body;

  // Validate required fields
  if (!city || !latitude || !longitude) {
    return res.status(400).json({ error: 'City and location are required' });
  }

  try {
    // Calculate profile completeness based on provided data
    const skillsArray = (Array.isArray(skills) ? skills : []).slice(0, 25);
    const profile_completeness = 0.2
      + (city ? 0.1 : 0)
      + (skillsArray.length > 0 ? 0.2 : 0)
      + (hourly_rate ? 0.1 : 0)
      + (bio ? 0.1 : 0)
      + (avatar_url ? 0.1 : 0);

    // Check if email was verified during onboarding (before DB row existed)
    let emailVerifiedAt = null;
    const { data: emailVerification } = await supabase
      .from('email_verifications')
      .select('verified_at')
      .eq('user_id', userId)
      .not('verified_at', 'is', null)
      .single();
    if (emailVerification?.verified_at) {
      emailVerifiedAt = emailVerification.verified_at;
      // Clean up the verification record
      await supabase.from('email_verifications').delete().eq('user_id', userId);
    }

    // Upsert user with onboarding data
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name,
        type: 'human',
        account_type: 'human',
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
        verified: true,
        availability: 'available',
        profile_completeness,
        needs_onboarding: false,
        onboarding_completed_at: new Date().toISOString(),
        ...(emailVerifiedAt ? { email_verified_at: emailVerifiedAt } : {})
      }, { onConflict: 'id' })
      .select(USER_SELECT_COLUMNS)
      .single();

    if (error) {
      console.error('Onboarding error:', error);
      return res.status(500).json({ error: safeErrorMessage(error) });
    }

    // Seed default notification preferences (idempotent — ON CONFLICT DO NOTHING)
    if (_notificationService && data?.id) {
      _notificationService.seedDefaultPreferences(data.id).catch(err => {
        console.error('[Onboarding] Failed to seed notification preferences:', err.message);
      });
    }

    // Parse skills and languages back to arrays for response
    // Strip sensitive fields that should never reach the client
    const { password_hash, webhook_secret, ...safeData } = data;
    const userData = {
      ...safeData,
      skills: safeParseJsonArray(data.skills),
      languages: safeParseJsonArray(data.languages),
      needs_onboarding: false
    };

    res.json({ user: userData });
  } catch (e) {
    console.error('Onboarding exception:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ EMAIL VERIFICATION ============
// Send verification code (6-digit code stored in DB)
app.post('/api/auth/send-verification', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Try normal auth first, then fall back to JWT-only for onboarding users (no DB row yet)
  let userId, userEmail;
  const dbUser = await getUserByToken(req.headers.authorization);
  if (dbUser) {
    if (dbUser.email_verified_at) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    userId = dbUser.id;
    userEmail = dbUser.email;
  } else {
    // Onboarding user: valid JWT but no users table row yet
    const cleanToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(cleanToken);
      if (!authUser || error) return res.status(401).json({ error: 'Unauthorized' });
      userId = authUser.id;
      userEmail = authUser.email;
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!userEmail) return res.status(400).json({ error: 'No email associated with account' });

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry

  // Store verification code (upsert by user_id)
  const { error } = await supabase
    .from('email_verifications')
    .upsert({
      id: uuidv4(),
      user_id: userId,
      email: userEmail,
      code,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[EmailVerify] Error storing code:', error);
    return res.status(500).json({ error: 'Failed to generate verification code' });
  }

  // Send email via configured provider (Resend, SendGrid, etc.)
  // If no email provider configured, log to console (development mode)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@irlwork.ai';

  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [userEmail],
          subject: 'Verify your irlwork.ai email',
          html: `<h2>Email Verification</h2><p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 30 minutes.</p>`
        })
      });
      console.log(`[EmailVerify] Sent verification email to ${userEmail}`);
    } catch (emailErr) {
      console.error('[EmailVerify] Failed to send email:', emailErr.message);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }
  } else {
    console.log(`[EmailVerify] DEV MODE — Verification code for ${userEmail}: ${code}`);
  }

  res.json({ success: true, message: 'Verification code sent to your email' });
});

// Verify code
app.post('/api/auth/verify-email', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Try normal auth first, then fall back to JWT-only for onboarding users
  let userId, hasDbRow = false;
  const dbUser = await getUserByToken(req.headers.authorization);
  if (dbUser) {
    if (dbUser.email_verified_at) {
      return res.json({ success: true, message: 'Email already verified' });
    }
    userId = dbUser.id;
    hasDbRow = true;
  } else {
    const cleanToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(cleanToken);
      if (!authUser || error) return res.status(401).json({ error: 'Unauthorized' });
      userId = authUser.id;
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  // Look up the verification code
  const { data: verification, error: lookupError } = await supabase
    .from('email_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code.trim())
    .single();

  if (lookupError || !verification) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  if (new Date(verification.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (hasDbRow) {
    // User has a DB row — mark email as verified directly
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to verify email' });
    }
    // Clean up verification record
    await supabase.from('email_verifications').delete().eq('user_id', userId);
  } else {
    // Onboarding user — mark the verification record as verified so the onboard endpoint can pick it up
    await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('code', code.trim());
  }

  res.json({ success: true, message: 'Email verified successfully' });
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

    // Seed default notification preferences for new agent
    if (_notificationService) {
      _notificationService.seedDefaultPreferences(userId).catch(err => {
        console.error('[Registration] Failed to seed notification preferences:', err.message);
      });
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
    // Count humans
    const { count: humansCount, error: humansError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'human');

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
    .select('id, name, city, state, country, country_code, hourly_rate, bio, skills, rating, jobs_completed, verified, availability, created_at, updated_at, total_ratings_count, social_links, headline, languages, timezone, travel_radius, latitude, longitude, avatar_url, subscription_tier, total_tasks_completed')
    .eq('type', 'human');

  if (category) query = query.like('skills', `%${escapeLike(category)}%`);
  if (city) query = query.like('city', `%${escapeLike(city)}%`);
  if (min_rate) query = query.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) query = query.lte('hourly_rate', parseFloat(max_rate));

  const { data: humans, error } = await query.order('rating', { ascending: false }).limit(100);

  if (error) {
    console.error('[GET /api/humans] Supabase query error:', error.message || error);
    return res.status(500).json({ error: safeErrorMessage(error) });
  }

  // Parse skills and languages for all humans
  let results = humans?.map(h => ({ ...h, skills: safeParseJsonArray(h.skills), languages: safeParseJsonArray(h.languages) })) || [];

  // Apply distance filtering if coordinates provided
  if (user_lat && user_lng && radius) {
    const userLatitude = parseFloat(user_lat);
    const userLongitude = parseFloat(user_lng);
    const maxRadius = parseFloat(radius);

    if (!isNaN(userLatitude) && !isNaN(userLongitude) && !isNaN(maxRadius)) {
      results = filterByDistance(results, userLatitude, userLongitude, maxRadius);
    }
  }

  // Sort: available first, then by subscription tier priority (Pro > Builder > Free), then by rating
  results.sort((a, b) => {
    const aAvail = a.availability === 'available' ? 1 : 0;
    const bAvail = b.availability === 'available' ? 1 : 0;
    if (bAvail !== aAvail) return bAvail - aAvail;
    const aPriority = getTierConfig(a.subscription_tier || 'free').worker_priority;
    const bPriority = getTierConfig(b.subscription_tier || 'free').worker_priority;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return (b.rating || 0) - (a.rating || 0);
  });

  res.json(results);
});

app.get('/api/users/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const requester = await getUserByToken(req.headers.authorization);
  const isSelf = requester && requester.id === req.params.id;

  const columns = isSelf
    ? 'id, name, email, city, state, hourly_rate, bio, skills, rating, jobs_completed, total_tasks_completed, total_tasks_posted, total_paid, type, avatar_url, subscription_tier, tasks_posted_this_month'
    : 'id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, total_tasks_completed, total_tasks_posted, type, avatar_url, subscription_tier';

  const { data: user, error } = await supabase
    .from('users')
    .select(columns)
    .eq('id', req.params.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user, skills: safeParseJsonArray(user.skills) });
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
    .select('id, name, city, state, hourly_rate, bio, skills, rating, jobs_completed, profile_completeness, avatar_url, headline, languages, timezone, social_links, travel_radius')
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();

  if (error || !user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user, skills: safeParseJsonArray(user.skills), languages: safeParseJsonArray(user.languages) });
});

// ============ PROFILE ============
app.put('/api/humans/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, hourly_rate, bio, categories, skills, city, latitude, longitude, travel_radius, country, country_code, social_links, headline, languages, timezone, avatar_url, availability, gender } = req.body;

    const updates = { updated_at: new Date().toISOString(), needs_onboarding: false, verified: true, type: 'human', account_type: 'human' };
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (name) updates.name = name;
    if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate;
    if (bio !== undefined) updates.bio = bio;
    // Accept both 'skills' and 'categories' for backwards compatibility
    // Store as JSON string to match registration format
    if (skills) {
      const arr = (Array.isArray(skills) ? skills : safeParseJsonArray(skills)).slice(0, 25);
      updates.skills = JSON.stringify(arr);
    }
    if (categories) {
      const arr = (Array.isArray(categories) ? categories : safeParseJsonArray(categories)).slice(0, 25);
      updates.skills = JSON.stringify(arr);
    }
    if (city) updates.city = city;
    if (latitude !== undefined) updates.latitude = latitude != null ? parseFloat(latitude) : null;
    if (longitude !== undefined) updates.longitude = longitude != null ? parseFloat(longitude) : null;
    if (country !== undefined) updates.country = country;
    if (country_code !== undefined) updates.country_code = country_code;
    if (travel_radius !== undefined) {
      updates.travel_radius = travel_radius;
      updates.service_radius = travel_radius;
    }
    if (languages !== undefined) updates.languages = JSON.stringify(Array.isArray(languages) ? languages : []);
    if (social_links !== undefined) {
      const allowedPlatforms = ['twitter', 'instagram', 'linkedin', 'github', 'tiktok', 'youtube'];
      const cleaned = {};
      if (typeof social_links === 'object' && social_links !== null) {
        for (const [key, value] of Object.entries(social_links)) {
          if (!allowedPlatforms.includes(key) || typeof value !== 'string' || !value.trim()) continue;
          let v = value.trim();
          // Normalize URLs without protocol (e.g. "x.com/user")
          if (/^(www\.)?(x|twitter|instagram|linkedin|github|tiktok|youtube|youtu)\.(com|be)\//i.test(v)) {
            v = 'https://' + v;
          }
          // If it looks like a URL, parse it properly
          if (/^https?:\/\//i.test(v)) {
            try {
              const url = new URL(v);
              const parts = url.pathname.split('/').filter(Boolean);
              if (key === 'linkedin' && parts[0] === 'in' && parts[1]) {
                v = parts[1].replace(/^@/, '');
              } else if (key === 'youtube' && (parts[0] === 'c' || parts[0] === 'channel') && parts[1]) {
                v = parts[1];
              } else if (parts.length > 0) {
                v = parts[0].replace(/^@/, '');
              }
            } catch {
              // Not a valid URL, strip common prefixes as fallback
              v = v.replace(/^https?:\/\/(www\.)?(twitter|x|instagram|linkedin|github|tiktok|youtube)\.com\/(in\/)?(@)?/i, '');
            }
          }
          // Strip leading @ for non-URL input
          v = v.replace(/^@/, '');
          if (v) cleaned[key] = v;
        }
      }
      updates.social_links = cleaned;
    }
    if (headline !== undefined) updates.headline = (headline || '').slice(0, 120);
    if (timezone !== undefined) updates.timezone = timezone;
    if (availability === 'available' || availability === 'unavailable') updates.availability = availability;
    if (gender !== undefined && userHasGenderColumn) {
      const validGenders = ['man', 'woman', 'other'];
      updates.gender = validGenders.includes(gender) ? gender : null;
    }

    // Auto-derive timezone from coordinates when location changes but timezone not explicitly set
    if (updates.latitude != null && updates.longitude != null && timezone === undefined) {
      try {
        const tzResults = findTimezone(updates.latitude, updates.longitude);
        if (tzResults && tzResults.length > 0) {
          updates.timezone = tzResults[0];
        }
      } catch (e) {
        console.error('[Profile] Failed to derive timezone:', e.message);
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select(USER_SELECT_COLUMNS)
      .single();

    if (error) return res.status(500).json({ error: safeErrorMessage(error) });

    // Parse JSONB fields before sending to match auth/verify response format
    res.json({ success: true, user: { ...data, skills: safeParseJsonArray(data.skills), languages: safeParseJsonArray(data.languages) } });
  } catch (e) {
    console.error('[Profile Update] Error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ TASKS ============
app.get('/api/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { category, city, urgency, status, my_tasks, user_lat, user_lng, radius_km } = req.query;
  const user = await getUserByToken(req.headers.authorization);

  // Only return safe public columns (no escrow, deposit, or internal fields)
  let safeTaskColumns = 'id, title, description, category, location, latitude, longitude, budget, deadline, status, task_type, quantity, human_ids, created_at, updated_at, country, country_code, human_id, agent_id, requirements, required_skills, moderation_status, is_remote, max_humans';
  if (taskColumnFlags.spots_filled) safeTaskColumns += ', spots_filled';
  if (taskColumnFlags.is_anonymous) safeTaskColumns += ', is_anonymous';
  if (taskColumnFlags.duration_hours) safeTaskColumns += ', duration_hours';
  let query = supabase.from('tasks').select(safeTaskColumns);

  if (category) query = query.eq('category', category);
  if (urgency) query = query.eq('urgency', urgency);
  if (status) {
    // Prevent querying internal statuses via public browse
    const INTERNAL_STATUSES = ['pending_review'];
    if (!my_tasks && INTERNAL_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    query = query.eq('status', status);
  }
  if (my_tasks && user) query = query.eq('agent_id', user.id);

  // Filter out moderated, expired, and pending_review tasks from browse (unless viewing own tasks)
  if (!my_tasks) {
    query = query.not('moderation_status', 'in', '("hidden","removed")');
    query = query.not('status', 'eq', 'expired');
    query = query.not('status', 'eq', 'pending_review');
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  let results = tasks || [];

  // Apply location filtering
  if (user_lat && user_lng && radius_km !== 'anywhere') {
    const userLatitude = parseFloat(user_lat);
    const userLongitude = parseFloat(user_lng);
    const radiusKm = parseFloat(radius_km) || 50;

    if (isNaN(userLatitude) || isNaN(userLongitude)) {
      // Invalid coordinates — skip distance filtering
    } else if (radiusKm === 0) {
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
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  // Task posting limit check (free tier: 5/month)
  const userTier = user.subscription_tier || 'free';
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let tasksPosted = user.tasks_posted_this_month || 0;

  if (!user.tasks_posted_month_reset || new Date(user.tasks_posted_month_reset) < monthStart) {
    // Reset counter for new month
    await supabase.from('users').update({
      tasks_posted_this_month: 0,
      tasks_posted_month_reset: monthStart.toISOString()
    }).eq('id', user.id);
    tasksPosted = 0;
  }

  if (!canPostTask(tasksPosted, userTier)) {
    const tierConfig = getTierConfig(userTier);
    return res.status(403).json({
      error: 'Monthly task posting limit reached',
      code: 'task_limit_reached',
      limit: tierConfig.task_limit_monthly,
      posted: tasksPosted,
      upgrade_url: '/premium'
    });
  }

  const { title, description, instructions, instructions_attachments, category, location, budget, latitude, longitude, is_remote, duration_hours, deadline, requirements, required_skills, is_anonymous, task_type, quantity, max_humans, country, country_code, task_type_id, location_zone, private_address, private_notes, private_contact, budget_usd, datetime_start, skills_required: skillsRequiredInput } = req.body;

  // Verify agent has payment method before allowing task creation
  let createPaymentMethods = [];
  if (user.stripe_customer_id && stripe) {
    try {
      createPaymentMethods = await listPaymentMethods(user.stripe_customer_id);
    } catch (e) {
      console.error('[TaskCreate] Failed to list Stripe payment methods:', e.message);
    }
  }
  if (createPaymentMethods.length === 0 && !user.wallet_address) {
    return res.status(402).json({
      error: 'No payment method on file',
      code: 'payment_required',
      message: 'You must link a payment card or crypto wallet before posting a task.'
    });
  }

  // Run validation pipeline if task_type_id is provided
  const { proceed, flagged: taskFlagged, errorResponse } = await runTaskValidation(supabase, req.body, user.id);
  if (!proceed) return res.status(422).json(errorResponse);

  // Validate required fields (legacy validation — runs for all tasks)
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (title.trim().length > 200) {
    return res.status(400).json({ error: 'Title must be 200 characters or less' });
  }
  if (description && description.length > 5000) {
    return res.status(400).json({ error: 'Description must be 5000 characters or less' });
  }
  if (requirements && requirements.length > 3000) {
    return res.status(400).json({ error: 'Requirements must be 3000 characters or less' });
  }
  if (location && location.length > 300) {
    return res.status(400).json({ error: 'Location must be 300 characters or less' });
  }
  const parsedBudget = parseFloat(budget || budget_usd);
  if ((!budget && !budget_usd) || isNaN(parsedBudget) || parsedBudget < 5) {
    return res.status(400).json({ error: 'Budget must be at least $5' });
  }
  if (parsedBudget > 100000) {
    return res.status(400).json({ error: 'Budget cannot exceed $100,000' });
  }
  if (!duration_hours || isNaN(parseFloat(duration_hours)) || parseFloat(duration_hours) <= 0) {
    return res.status(400).json({ error: 'duration_hours is required and must be a positive number' });
  }
  if (parseFloat(duration_hours) > 720) {
    return res.status(400).json({ error: 'duration_hours cannot exceed 720 (30 days)' });
  }

  const id = uuidv4();
  const budgetAmount = parseFloat(budget || budget_usd) || 50;
  const taskType = task_type === 'open' ? 'open' : 'direct';
  const taskQuantity = taskType === 'open' ? Math.max(1, parseInt(quantity) || 1) : 1;
  const skillsArray = (Array.isArray(required_skills || skillsRequiredInput) ? (required_skills || skillsRequiredInput) : []).slice(0, 25);

  // Encrypt private fields if provided
  let encryptedAddress = null;
  let encryptedNotes = null;
  let encryptedContact = null;
  try {
    if (private_address) encryptedAddress = encryptField(private_address);
    if (private_notes) encryptedNotes = encryptField(private_notes);
    if (private_contact) encryptedContact = encryptField(private_contact);
  } catch (encErr) {
    console.error('[Tasks] Encryption error:', encErr.message);
    // Continue without encrypting — fields won't be stored
  }

  const insertData = buildTaskInsertData({
      id,
      agent_id: user.id,
      title: title.trim(),
      description,
      instructions: instructions || null,
      instructions_attachments: Array.isArray(instructions_attachments) ? instructions_attachments : [],
      category: category || (task_type_id ? task_type_id : 'general'),
      location: location || location_zone || null,
      latitude: latitude ? parseFloat(parseFloat(latitude).toFixed(3)) : null,
      longitude: longitude ? parseFloat(parseFloat(longitude).toFixed(3)) : null,
      country: country || null,
      country_code: country_code || null,
      budget: budgetAmount,
      status: taskFlagged ? 'pending_review' : 'open',
      task_type: taskType,
      quantity: taskQuantity,
      human_ids: [],
      escrow_amount: budgetAmount,
      is_remote: !!is_remote,
      deadline: deadline || datetime_start || null,
      duration_hours: parseFloat(duration_hours),
      requirements: requirements || null,
      required_skills: skillsArray,
      max_humans: max_humans ? Math.max(1, Math.min(parseInt(max_humans) || 1, 100)) : 1,
      task_type_id: task_type_id || null,
      location_zone: location_zone || null,
      private_address: encryptedAddress,
      private_notes: encryptedNotes,
      private_contact: encryptedContact,
      created_at: new Date().toISOString()
    }, {
      is_anonymous: !!is_anonymous,
      duration_hours: parseFloat(duration_hours),
    });

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Increment total_tasks_posted for agent
  if (user.type === 'agent') {
    await supabase.rpc('increment_user_stat', {
      user_id_param: user.id, stat_name: 'total_tasks_posted', increment_by: 1
    });
  }

  // Increment monthly task posting counter
  await supabase.from('users').update({
    tasks_posted_this_month: (tasksPosted + 1),
    updated_at: new Date().toISOString()
  }).eq('id', user.id);

  const response = stripPrivateFields(task);
  response.message = 'Task posted successfully.';
  if (encryptedAddress || encryptedNotes || encryptedContact) {
    response.private_fields_stored = [];
    if (encryptedAddress) response.private_fields_stored.push('private_address');
    if (encryptedNotes) response.private_fields_stored.push('private_notes');
    if (encryptedContact) response.private_fields_stored.push('private_contact');
    response.note = 'Private fields will be released to the assigned worker upon task acceptance';
  }
  if (taskFlagged) {
    response.status = 'pending_review';
    response.note = 'Task flagged for review. It will become visible after approval.';
  }

  res.json(response);
});

app.get('/api/tasks/:id', async (req, res, next) => {
  // Skip if id is a reserved route name (handled by later routes)
  const reservedRoutes = ['available', 'my-tasks'];
  if (reservedRoutes.includes(req.params.id)) {
    return next();
  }

  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  // Use SELECT * for the agent join to avoid 404s when columns from migrations
  // haven't been applied yet (same fix as /api/humans/:id/profile in 9df2499)
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*, agent:users!tasks_agent_id_fkey(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !task) {
    console.error('Task detail fetch error:', error?.message || 'Task not found', 'id:', req.params.id);
    return res.status(404).json({ error: 'Not found' });
  }

  // Extract poster from joined agent data (single query instead of N+1)
  let poster = null;
  if (task.agent_id) {
    if (task.is_anonymous) {
      poster = { name: 'Anonymous', type: 'unknown' };
    } else {
      poster = task.agent || null;
    }
  }
  delete task.agent; // Remove joined field from task response

  // Get applicant count
  const { count: applicantCount } = await supabase
    .from('task_applications')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', req.params.id);
  task.applicant_count = applicantCount || 0;

  // Only return sensitive financial/escrow fields to task participants
  const user = await getUserByToken(req.headers.authorization);
  const isParticipant = user && (task.agent_id === user.id || task.human_id === user.id || (Array.isArray(task.human_ids) && task.human_ids.includes(user.id)));

  if (!isParticipant) {
    const { escrow_amount, escrow_status, escrow_deposited_at, escrow_released_at,
            deposit_amount_cents, unique_deposit_amount, instructions,
            work_started_at, proof_submitted_at, assigned_at, ...publicTask } = task;
    return res.json(stripPrivateFields({ ...publicTask, poster }));
  }
  res.json(stripPrivateFields({ ...task, poster }));
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

// Task stats (application count + view count) - public endpoint
app.get('/api/tasks/:id/stats', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const [appResult, viewResult] = await Promise.all([
    supabase
      .from('task_applications')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', req.params.id),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('page_type', 'task')
      .eq('target_id', req.params.id)
  ]);

  res.json({
    applications: appResult.count || 0,
    views: viewResult.count || 0
  });
});

app.post('/api/tasks/:id/apply', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { cover_letter, availability, questions, proposed_rate } = req.body;
  const taskId = req.params.id;

  // Verify task exists, is open, and user is not the agent
  const { data: taskForApply } = await supabase
    .from('tasks').select('status, agent_id, title').eq('id', taskId).single();
  if (!taskForApply) return res.status(404).json({ error: 'Task not found' });
  if (taskForApply.status !== 'open') {
    return res.status(409).json({ error: 'task_not_open', message: 'This task is no longer accepting applications.' });
  }
  if (taskForApply.agent_id === user.id) {
    return res.status(400).json({ error: 'Cannot apply to your own task.' });
  }

  // Check for duplicate application
  const { data: existing } = await supabase
    .from('task_applications')
    .select('id')
    .eq('task_id', taskId)
    .eq('human_id', user.id)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'Already applied' });
  }

  const id = uuidv4();
  const { data: application, error } = await supabase
    .from('task_applications')
    .insert({
      id,
      task_id: taskId,
      human_id: user.id,
      cover_letter: cover_letter || '',
      availability: availability || '',
      questions: questions || null,
      proposed_rate,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Notify agent about new application
  await createNotification(
    taskForApply.agent_id,
    'new_application',
    'New Applicant',
    `${user.name || 'A worker'} applied to "${taskForApply.title}"`,
    `/tasks/${taskId}`
  );
  dispatchWebhook(taskForApply.agent_id, {
    type: 'new_application',
    task_id: taskId,
    data: { applicant: { id: user.id, name: user.name, proposed_rate } }
  });

  // Email notification for new application
  const applyTaskUrl = `https://www.irlwork.ai/tasks/${taskId}`;
  sendEmailNotification(taskForApply.agent_id,
    `New applicant for "${taskForApply.title}"`,
    `<div style="background: #EEF2FF; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #4338CA; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">New Application</p>
      <p style="color: #1A1A1A; font-size: 14px; margin: 0;"><strong>${user.name || 'A worker'}</strong> applied to your task "${taskForApply.title}".</p>
    </div>
    <a href="${applyTaskUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Review Applicants</a>`
  ).catch(() => {});

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

  // Get all applications for this task (with reputation fields)
  const { data: applications, error } = await supabase
    .from('task_applications')
    .select(`
      *,
      applicant:users!task_applications_human_id_fkey(
        id,
        name,
        hourly_rate,
        rating,
        jobs_completed,
        bio,
        city,
        total_tasks_completed,
        total_tasks_accepted
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/tasks/:id/applications] Supabase query error:', error.message || error);
    return res.status(500).json({ error: safeErrorMessage(error) });
  }

  // Enrich with computed success_rate
  const enriched = (applications || []).map(app => {
    const a = app.applicant;
    if (a) {
      const completed = a.total_tasks_completed || 0;
      a.success_rate = completed > 0 ? 100 : null; // null = no history yet
    }
    return app;
  });

  res.json(enriched);
});

// Check if current user has applied to a task
app.get('/api/tasks/:id/applications/check', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: application } = await supabase
    .from('task_applications')
    .select('id, status')
    .eq('task_id', req.params.id)
    .eq('human_id', user.id)
    .maybeSingle();

  res.json({
    has_applied: !!application,
    application: application || null
  });
});

// Withdraw application
app.delete('/api/tasks/:id/apply', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const taskId = req.params.id;

  // Verify task is still open
  const { data: task } = await supabase
    .from('tasks').select('status').eq('id', taskId).single();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status !== 'open') {
    return res.status(409).json({ error: 'Cannot withdraw — task is no longer accepting applications.' });
  }

  // Update application status
  const { data: withdrawn, error } = await supabase
    .from('task_applications')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('human_id', user.id)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error || !withdrawn) {
    return res.status(400).json({ error: 'No pending application to withdraw.' });
  }

  res.json({ success: true, message: 'Application withdrawn.' });
});

// Agent rejects (or reverts) an applicant
app.patch('/api/tasks/:id/applications/:applicationId', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId, applicationId } = req.params;
  const { status: newStatus } = req.body;

  if (!['rejected', 'pending'].includes(newStatus)) {
    return res.status(400).json({ error: 'Status must be "rejected" or "pending"' });
  }

  // Verify user is the task creator
  const { data: patchTask } = await supabase
    .from('tasks')
    .select('agent_id, title, status')
    .eq('id', taskId)
    .single();

  if (!patchTask || patchTask.agent_id !== user.id) {
    return res.status(403).json({ error: 'Only the task creator can manage applications' });
  }

  if (patchTask.status !== 'open') {
    return res.status(400).json({ error: 'Can only manage applications for open tasks' });
  }

  // Update the application status
  const { data: patchedApp, error: patchErr } = await supabase
    .from('task_applications')
    .update({ status: newStatus })
    .eq('id', applicationId)
    .eq('task_id', taskId)
    .select('id, human_id, status')
    .single();

  if (patchErr || !patchedApp) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Notify the applicant if rejected
  if (newStatus === 'rejected') {
    await createNotification(
      patchedApp.human_id,
      'application_rejected',
      'Application Update',
      `Your application for "${patchTask.title}" was not selected. Keep applying to other tasks!`,
      `/tasks/${taskId}`
    );

    dispatchWebhook(patchedApp.human_id, {
      type: 'application_rejected',
      task_id: taskId,
      data: {
        application_id: applicationId,
        title: patchTask.title
      }
    }).catch(() => {});
  }

  res.json({ id: patchedApp.id, status: newStatus });
});

// Decline an application
app.post('/api/tasks/:id/applications/:appId/decline', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId, appId } = req.params;

  // Verify user is the task creator
  const { data: task } = await supabase
    .from('tasks')
    .select('agent_id, title')
    .eq('id', taskId)
    .single();

  if (!task || task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get the application
  const { data: application } = await supabase
    .from('task_applications')
    .select('id, human_id, status')
    .eq('id', appId)
    .eq('task_id', taskId)
    .single();

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  if (application.status === 'rejected') {
    return res.status(400).json({ error: 'Application already declined' });
  }

  const { error } = await supabase
    .from('task_applications')
    .update({ status: 'rejected' })
    .eq('id', appId);

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Notify the applicant
  await createNotification(
    application.human_id,
    'application_declined',
    'Application Declined',
    `Your application for "${task.title}" was not selected.`,
    `/tasks/${taskId}`
  );

  res.json({ success: true });
});


// Agent assigns a human to a task
// Stripe path: charges agent immediately, task goes to in_progress
app.post('/api/tasks/:id/assign', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId } = req.params;
  const { human_id, payment_method_id, preferred_payment_method, note } = req.body;

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

  const isOpen = task.task_type === 'open';
  const maxQuantity = task.quantity || 1;
  const currentHumanIds = Array.isArray(task.human_ids) ? task.human_ids : [];
  const spotsFilled = currentHumanIds.length;

  // For direct hire: must be open status. For open type: must be open and have spots remaining
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Can only assign humans to open tasks' });
  }
  if (isOpen && spotsFilled >= maxQuantity) {
    return res.status(400).json({ error: `All ${maxQuantity} spots are already filled` });
  }

  // Check if this human is already assigned to this task (for open tasks)
  if (currentHumanIds.includes(human_id)) {
    return res.status(400).json({ error: 'This human is already assigned to this task' });
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
    .select('id, name')
    .eq('id', human_id)
    .single();

  const budgetAmount = task.escrow_amount || task.budget || 50;

  // Agent must have a pre-linked card before hiring
  let agentPaymentMethods = [];
  if (user.stripe_customer_id && stripe) {
    try {
      agentPaymentMethods = await listPaymentMethods(user.stripe_customer_id);
    } catch (e) {
      console.error('[Assign] Failed to list Stripe payment methods:', e.message);
      return res.status(502).json({ error: 'Unable to verify payment method. Please try again or add a new card.' });
    }
  }
  // Agent must have a card (Stripe) OR choose USDC
  const useUsdc = preferred_payment_method === 'usdc';
  if (agentPaymentMethods.length === 0 && !useUsdc) {
    return res.status(402).json({
      error: 'No payment method on file',
      code: 'payment_required',
      message: 'You must link a payment card or choose USDC before hiring.'
    });
  }

  // Updated human_ids array (append this human)
  const updatedHumanIds = [...currentHumanIds, human_id];
  const newSpotsFilled = updatedHumanIds.length;
  const allSpotsFilled = newSpotsFilled >= maxQuantity;

  // For open: task stays open until all spots filled
  // For direct: task moves to in_progress/assigned immediately
  const nextStatus = isOpen && !allSpotsFilled ? 'open' : undefined; // undefined = use path-specific default

  // Helper: accept application, conditionally reject others, notify human
  const finalizeAssignment = async (notificationMessage) => {
    await supabase
      .from('task_applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    // For direct hire or when all open task spots are filled, reject remaining applicants
    if (!isOpen || allSpotsFilled) {
      await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('task_id', taskId)
        .neq('status', 'accepted');
    }

    await createNotification(
      human_id,
      'task_assigned',
      'You\'ve Been Selected!',
      notificationMessage,
      `/tasks/${taskId}`
    );

    // Dispatch webhook to human about the assignment
    dispatchWebhook(human_id, {
      type: 'task_assigned',
      task_id: taskId,
      data: {
        title: task.title,
        budget: budgetAmount,
        agent_id: user.id
      }
    }).catch(() => {});
  };

  // ============ STRIPE PATH: Charge immediately and assign ============
  if (!useUsdc && agentPaymentMethods.length > 0) {
    const budgetCents = Math.round(budgetAmount * 100);

    // Calculate fees based on poster's tier
    const posterTier = user.subscription_tier || 'free';
    const posterFeeCents = calculatePosterFee(budgetCents, posterTier);
    const totalChargeCents = budgetCents + posterFeeCents;

    // Lock worker fee at assignment time
    const { data: workerUser } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', human_id)
      .single();
    const workerFeePercent = getTierConfig(workerUser?.subscription_tier || 'free').worker_fee_percent;

    // Charge agent's card immediately
    let chargeResult;
    try {
      chargeResult = await chargeAgentForTask(supabase, user.id, taskId, totalChargeCents);
    } catch (stripeError) {
      console.error(`[Assign] Payment failed for task ${taskId}:`, stripeError.message);
      return res.status(402).json({
        error: 'Payment failed',
        code: 'payment_error',
        message: 'Your payment could not be processed. Please update your payment method and try again.'
      });
    }

    // Atomic update: move to in_progress with escrow deposited
    const assignStatus = nextStatus || 'in_progress';
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(cleanTaskData({
        human_id: isOpen ? (updatedHumanIds[0] || human_id) : human_id,
        human_ids: updatedHumanIds,
        spots_filled: newSpotsFilled,
        status: assignStatus,
        escrow_status: 'deposited',
        escrow_deposited_at: new Date().toISOString(),
        escrow_amount: budgetAmount,
        stripe_payment_intent_id: chargeResult.payment_intent_id,
        payment_method: 'stripe',
        poster_fee_percent: getTierConfig(posterTier).poster_fee_percent,
        poster_fee_cents: posterFeeCents,
        worker_fee_percent: workerFeePercent,
        total_charge_cents: totalChargeCents,
        assigned_at: new Date().toISOString(),
        work_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      .eq('id', taskId)
      .eq('status', 'open')
      .select('id')
      .single();

    if (error || !updatedTask) {
      // Race condition: refund the charge
      try {
        const { refundPaymentIntent } = require('./backend/services/stripeService');
        await refundPaymentIntent(chargeResult.payment_intent_id, 'duplicate');
        console.log(`[Assign] Refunded charge for task ${taskId} (concurrent assign)`);
      } catch (refundErr) {
        console.error(`[Assign] CRITICAL: Failed to refund charge for task ${taskId}:`, refundErr);
      }
      return res.status(409).json({ error: 'Task is no longer available — it may have already been assigned' });
    }

    // Finalize: accept application, reject others, notify worker
    await finalizeAssignment(
      `You've been assigned to "${task.title}" ($${budgetAmount}). Payment is secured in escrow — you can start working now!`
    );

    // Increment total_tasks_accepted for the worker
    const { data: acceptWorker } = await supabase
      .from('users')
      .select('total_tasks_accepted')
      .eq('id', human_id)
      .single();
    await supabase
      .from('users')
      .update({
        total_tasks_accepted: (acceptWorker?.total_tasks_accepted || 0) + 1,
        last_active_at: new Date().toISOString()
      })
      .eq('id', human_id);

    // Send optional note as a message to the worker
    if (note && note.trim()) {
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .upsert({ human_id, agent_id: user.id, task_id: taskId }, { onConflict: 'human_id,agent_id,task_id', ignoreDuplicates: false })
          .select('id')
          .single();
        if (conv) {
          await supabase.from('messages').insert({ id: uuidv4(), conversation_id: conv.id, sender_id: user.id, content: note.trim() });
          await supabase.from('conversations').update({ last_message: note.trim(), updated_at: new Date().toISOString() }).eq('id', conv.id);
        }
      } catch (noteErr) {
        console.error('[Assign] Failed to send note:', noteErr.message);
      }
    }

    return res.json({
      success: true,
      task_id: taskId,
      worker: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
      human: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
      status: assignStatus,
      escrow_status: 'deposited',
      payment_method: 'stripe',
      total_charge_cents: totalChargeCents,
      poster_fee_cents: posterFeeCents,
      spots_filled: newSpotsFilled,
      spots_remaining: Math.max(0, maxQuantity - newSpotsFilled),
      message: 'Worker assigned and payment charged. Escrow deposited — work can begin.'
    });
  }

  // ============ USDC PATH: Manual deposit flow (existing) ============
  // Work in integer cents to avoid floating-point precision loss
  const randomCents = Math.floor(Math.random() * 99) + 1;
  const budgetCents = Math.round(budgetAmount * 100);
  const uniqueDepositAmount = (budgetCents + randomCents) / 100;

  // For open tasks with remaining spots, keep status 'open'
  const usdcStatus = nextStatus || 'assigned';
  const { data: usdcUpdated, error } = await supabase
    .from('tasks')
    .update(cleanTaskData({
      human_id: isOpen ? (updatedHumanIds[0] || human_id) : human_id,
      human_ids: updatedHumanIds,
      spots_filled: newSpotsFilled,
      status: usdcStatus,
      escrow_status: 'pending_deposit',
      unique_deposit_amount: uniqueDepositAmount,
      deposit_amount_cents: budgetCents + randomCents,
      payment_method: 'usdc',
      updated_at: new Date().toISOString()
    }))
    .eq('id', taskId)
    .eq('status', 'open')
    .select('id')
    .single();

  if (error || !usdcUpdated) {
    return res.status(409).json({ error: 'Task is no longer available — it may have already been assigned' });
  }

  await finalizeAssignment(
    `You've been selected for "${task.title}". Funding is in progress — you'll be notified when work can begin.`
  );

  // Send optional note as a message to the worker
  if (note && note.trim()) {
    try {
      const { data: conv } = await supabase
        .from('conversations')
        .upsert({ human_id, agent_id: user.id, task_id: taskId }, { onConflict: 'human_id,agent_id,task_id', ignoreDuplicates: false })
        .select('id')
        .single();
      if (conv) {
        await supabase.from('messages').insert({ id: uuidv4(), conversation_id: conv.id, sender_id: user.id, content: note.trim() });
        await supabase.from('conversations').update({ last_message: note.trim(), updated_at: new Date().toISOString() }).eq('id', conv.id);
      }
    } catch (noteErr) {
      console.error('[Assign] Failed to send note:', noteErr.message);
    }
  }

  res.json({
    success: true,
    task_id: taskId,
    worker: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
    human: { id: humanUser?.id || human_id, name: humanUser?.name || 'Human' },
    escrow_status: 'pending_deposit',
    payment_method: 'usdc',
    spots_filled: newSpotsFilled,
    spots_remaining: Math.max(0, maxQuantity - newSpotsFilled),
    deposit_instructions: {
      wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
      amount_usdc: uniqueDepositAmount,
      network: 'Base',
      note: 'Send exactly this amount. Your human will be notified once deposit is confirmed by the platform.'
    },
    message: isOpen && !allSpotsFilled
      ? `Human selected (${newSpotsFilled}/${maxQuantity} spots filled). Please send the exact USDC amount. Task remains open for more applicants.`
      : 'Human selected. Please send the exact USDC amount to complete the assignment.'
  });
});

// ============ AGENT PROMPT (dynamic, single source of truth) ============
app.get('/api/agent/prompt', (req, res) => {
  const { AGENT_PROMPT, VERBOSE_AGENT_PROMPT, PROMPT_VERSION, DEFAULT_API_KEY_SECTION } = require('./agent-prompt');
  // Support ?verbose=true to get the full v2 prompt for agents that can't make HTTP calls
  const useVerbose = req.query.verbose === 'true';
  const basePrompt = useVerbose ? VERBOSE_AGENT_PROMPT : AGENT_PROMPT;
  // Replace placeholders with defaults so the prompt is ready to use out of the box
  const prompt = basePrompt
    .replace('{{API_KEY_SECTION}}', DEFAULT_API_KEY_SECTION)
    .replaceAll('{{API_KEY_PLACEHOLDER}}', 'YOUR_API_KEY');
  res.json({
    version: PROMPT_VERSION,
    prompt,
    template: basePrompt,
    docs_url: 'https://www.irlwork.ai/api/mcp/docs',
    verbose: useVerbose,
    updated_at: new Date().toISOString()
  });
});

// ============ AGENT TASKS ============
app.get('/api/agent/tasks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { status, limit = 50 } = req.query;
  
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!human_id(id, name, hourly_rate, rating)
    `)
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));
  
  if (status) {
    query = query.eq('status', status);
  }

  const { data: tasks, error } = await query;

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Enrich with pending application counts
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id);
    const { data: appCounts } = await supabase
      .from('task_applications')
      .select('task_id, status')
      .in('task_id', taskIds)
      .eq('status', 'pending');

    const countMap = {};
    if (appCounts) {
      appCounts.forEach(a => {
        countMap[a.task_id] = (countMap[a.task_id] || 0) + 1;
      });
    }
    tasks.forEach(t => { t.pending_applicant_count = countMap[t.id] || 0; });
  }

  res.json(tasks || []);
});

// Release payment for a task — uses Stripe pipeline with 48-hour hold
app.post('/api/tasks/:id/release', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, assignee:users!human_id(id, name, hourly_rate, rating, stripe_account_id)')
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

  try {
    // Use the proper Stripe pipeline with 48-hour hold
    await releasePaymentToPending(supabase, id, task.human_id, user.id, createNotification);

    // Atomic update: only set 'paid' if still in completed/approved
    await supabase
      .from('tasks')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['completed', 'approved']);

    const budget = parseFloat(task.budget) || 0;
    const budgetCents = Math.round(budget * 100);
    // Use stored worker fee from task if available, otherwise look up
    const workerFeePercent = task.worker_fee_percent != null ? task.worker_fee_percent : PLATFORM_FEE_PERCENT;
    const platformFeeCents = Math.round(budgetCents * workerFeePercent / 100);
    const platformFee = platformFeeCents / 100;
    const netAmount = budget - platformFee;

    res.json({
      success: true,
      amount: budget,
      platformFee,
      netAmount,
      assignee: task.assignee
    });
  } catch (e) {
    console.error('Payment release error:', e);
    return res.status(409).json({ error: safeErrorMessage(e) });
  }
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
  const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL') || getEnv('CLOUD_PUBLIC_URL');

  // Demo mode if no R2 config
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    const { file, filename, mimeType } = req.body;
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uniqueFilename = `proofs/${user.id}/${timestamp}-${randomStr}.${fileCheck.ext}`;
    const mockUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${uniqueFilename}` : `https://pub-r2.dev/${R2_BUCKET}/${uniqueFilename}`;
    console.log(`[R2 DEMO] Would upload to: ${mockUrl}`);
    return res.json({ url: mockUrl, filename: uniqueFilename, success: true, demo: true });
  }

  try {
    const { file, filename, mimeType } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });

    // Server-side file size validation (10MB max for proof files)
    const base64Data = file.startsWith('data:') ? file.split(',')[1] : file;
    const fileSizeBytes = Buffer.byteLength(base64Data, 'base64');
    if (fileSizeBytes > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'File must be under 10MB' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = fileCheck.ext;
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
        ContentDisposition: 'attachment',
      }));

      uploadSuccess = true;
    } catch (s3Error) {
      console.error('R2 upload error:', s3Error.message);
      // Fallback to demo URL
    }

    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${uniqueFilename}` : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${uniqueFilename}`;
    
    res.json({
      url: publicUrl,
      filename: uniqueFilename,
      success: uploadSuccess,
      demo: !uploadSuccess
    });
  } catch (e) {
    console.error('Upload error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ AVATAR UPLOAD ============
app.post('/api/upload/avatar', async (req, res) => {
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
  const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL') || getEnv('CLOUD_PUBLIC_URL');

  // Derive API base URL from the incoming request (works in both dev and production)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const API_BASE = host ? `${protocol}://${host}` : (getEnv('API_URL') || `http://localhost:${PORT}`);

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    // Demo mode — no R2 creds, store base64 in DB so proxy can serve it
    const { file, filename, mimeType } = req.body;
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });
    if (!file) return res.status(400).json({ error: 'No file provided' });
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uniqueFilename = `avatars/${user.id}/${timestamp}-${randomStr}.${fileCheck.ext}`;
    console.log(`[R2 DEMO] Storing avatar in DB for user: ${user.id}`);

    // Store the base64 data URL in DB so the proxy endpoint can serve it
    const avatarData = file.startsWith('data:') ? file : `data:${mimeType || 'image/jpeg'};base64,${file}`;

    const avatarUrl = `${API_BASE}/api/avatar/${user.id}?v=${timestamp}`;
    // Try saving with avatar_data; if column doesn't exist, save without it
    let demoDbErr;
    const result = await supabase.from('users').update({
      avatar_url: avatarUrl,
      avatar_r2_key: uniqueFilename,
      avatar_data: avatarData,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
    demoDbErr = result.error;

    if (demoDbErr && demoDbErr.message && demoDbErr.message.includes('avatar_data')) {
      console.log('[Avatar DEMO] avatar_data column not found, saving without it');
      const result2 = await supabase.from('users').update({
        avatar_url: avatarUrl,
        avatar_r2_key: uniqueFilename,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      demoDbErr = result2.error;
    }

    if (demoDbErr) {
      console.error('[Avatar DEMO] DB update error:', demoDbErr.message);
      return res.status(500).json({ error: 'Failed to save avatar' });
    }

    // Verify the save actually worked
    const { data: verify } = await supabase.from('users').select('avatar_url').eq('id', user.id).single();
    console.log(`[Avatar DEMO] Saved. avatar_url=${verify?.avatar_url?.substring(0, 80)}`);

    if (demoDbErr) {
      console.error('[Avatar DEMO] DB update error:', demoDbErr.message);
      return res.status(500).json({ error: 'Failed to save avatar' });
    }

    return res.json({ url: avatarUrl, filename: uniqueFilename, success: true, demo: true });
  }

  try {
    const { file, filename, mimeType } = req.body;
    console.log(`[Avatar Upload] User: ${user.id}, Filename: ${filename}, MimeType: ${mimeType}, HasFile: ${!!file}, FileStringLength: ${file?.length || 0}`);
    if (!file) return res.status(400).json({ error: 'No file provided' });

    // Validate file type
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });

    // Server-side file size validation (5MB max after compression)
    const base64Data = file.startsWith('data:') ? file.split(',')[1] : file;
    const fileSizeBytes = Buffer.byteLength(base64Data, 'base64');
    console.log(`[Avatar Upload] Base64 length: ${base64Data.length}, Decoded file size: ${fileSizeBytes} bytes (${(fileSizeBytes / 1024).toFixed(1)}KB)`);
    if (fileSizeBytes < 500) {
      console.error(`[Avatar Upload] WARNING: File suspiciously small (${fileSizeBytes} bytes). Possible truncation or corrupt upload.`);
      return res.status(400).json({ error: `Image too small (${fileSizeBytes} bytes) — file may be corrupted. Please try again.` });
    }
    if (fileSizeBytes < 5000) {
      console.warn(`[Avatar Upload] WARNING: File is very small (${fileSizeBytes} bytes). May be low quality.`);
    }
    if (fileSizeBytes > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image must be under 5MB' });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = fileCheck.ext;
    const uniqueFilename = `avatars/${user.id}/${timestamp}-${randomStr}.${ext}`;

    let fileData = file;
    if (file.startsWith('data:')) {
      fileData = Buffer.from(file.split(',')[1], 'base64');
    } else if (typeof file === 'string' && !file.startsWith('/') && !file.startsWith('http')) {
      fileData = Buffer.from(file, 'base64');
    }

    // Delete old R2 avatar if it exists
    const oldR2Key = user.avatar_r2_key;
    if (oldR2Key) {
      try {
        const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
        });
        await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldR2Key }));
        console.log(`[Avatar] Deleted old R2 avatar: ${oldR2Key}`);
      } catch (delErr) {
        console.warn(`[Avatar] Failed to delete old R2 avatar (non-fatal): ${delErr.message}`);
      }
    }

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
        ContentDisposition: 'inline',
      }));
    } catch (s3Error) {
      console.error('R2 avatar upload error:', s3Error.message);
      return res.status(502).json({ error: 'Failed to upload to storage. Please try again.' });
    }

    // Always use the API proxy URL — it reliably serves the image inline.
    // R2 public URLs can break (CORS, ContentDisposition: attachment, bucket config)
    // and the proxy is always accessible. The R2 key is stored separately for the proxy to use.
    // Include cache-buster so browsers/CDNs serve the fresh image on all pages.
    const avatarUrl = `${API_BASE}/api/avatar/${user.id}?v=${timestamp}`;

    // Store base64 in DB as fallback when R2 is unavailable
    const avatarDataUrl = file.startsWith('data:') ? file : `data:${mimeType || 'image/jpeg'};base64,${file}`;

    // Save display URL, R2 key, and base64 fallback
    let dbError;
    const dbResult = await supabase.from('users').update({
      avatar_url: avatarUrl,
      avatar_r2_key: uniqueFilename,
      avatar_data: avatarDataUrl,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
    dbError = dbResult.error;

    // If avatar_data column doesn't exist, save without it
    if (dbError && dbError.message && dbError.message.includes('avatar_data')) {
      console.log('[Avatar Upload] avatar_data column not found, saving without it');
      const dbResult2 = await supabase.from('users').update({
        avatar_url: avatarUrl,
        avatar_r2_key: uniqueFilename,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      dbError = dbResult2.error;
    }

    if (dbError) {
      console.error('Avatar DB update error:', dbError.message);
      return res.status(500).json({ error: 'Failed to save avatar. Please try again.' });
    }

    // Verify the save actually worked
    const { data: verify } = await supabase.from('users').select('avatar_url, avatar_r2_key').eq('id', user.id).single();
    console.log(`[Avatar Upload] Verified save: avatar_url=${verify?.avatar_url?.substring(0, 80)}, r2_key=${verify?.avatar_r2_key}`);

    res.json({ url: avatarUrl, filename: uniqueFilename, success: true, bytes_uploaded: fileSizeBytes });
  } catch (e) {
    console.error('Avatar upload error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ AVATAR SERVE (proxy from R2, fallback to DB base64) ============
app.get('/api/avatar/:userId', async (req, res) => {
  // Allow cross-origin image loading (fixes ERR_BLOCKED_BY_RESPONSE.NotSameOrigin)
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Access-Control-Allow-Origin', '*');

  if (!supabase) return res.status(404).send('Not found');

  try {
    // Try to fetch with avatar_data column; if column doesn't exist, retry without it
    let user, fetchErr;
    const result1 = await supabase.from('users').select('avatar_url, avatar_r2_key, avatar_data, name').eq('id', req.params.userId).single();
    if (result1.error && result1.error.message && result1.error.message.includes('avatar_data')) {
      // avatar_data column doesn't exist yet — query without it
      console.log('[Avatar Serve] avatar_data column not found, querying without it');
      const result2 = await supabase.from('users').select('avatar_url, avatar_r2_key, name').eq('id', req.params.userId).single();
      user = result2.data;
      fetchErr = result2.error;
    } else {
      user = result1.data;
      fetchErr = result1.error;
    }
    console.log(`[Avatar Serve] userId=${req.params.userId}, found=${!!user}, r2_key=${user?.avatar_r2_key || 'none'}, avatar_data=${user?.avatar_data ? `${user.avatar_data.length} chars` : 'NULL'}, fetchErr=${fetchErr?.message || 'none'}`);
    if (!user) return res.status(404).send('No avatar');

    // If avatar_r2_key exists and R2 is configured, serve directly from R2
    if (user.avatar_r2_key) {
      const getEnv = (k) => {
        try { return require('process').env[k]; } catch { return null; }
      };
      const R2_ACCOUNT_ID = getEnv('R2ID') || getEnv('CLOUD_ID') || getEnv('R2_ACCOUNT_ID');
      const R2_ACCESS_KEY = getEnv('R2KEY') || getEnv('CLOUD_KEY') || getEnv('R2_ACCESS_KEY');
      const R2_SECRET_KEY = getEnv('R2SECRET') || getEnv('CLOUD_SECRET') || getEnv('R2_SECRET_KEY');
      const R2_BUCKET = getEnv('R2BUCKET') || getEnv('CLOUD_BUCKET') || getEnv('R2_BUCKET') || 'irlwork-proofs';

      if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY) {
        try {
          const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
          const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
          });

          const result = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: user.avatar_r2_key }));

          res.set('Content-Type', result.ContentType || 'image/jpeg');
          res.set('Cache-Control', 'public, max-age=300');
          return result.Body.pipe(res);
        } catch (r2Err) {
          console.error('Avatar R2 fetch error:', r2Err.message);
          // Fall through to DB base64 fallback
        }
      }
    }

    // Fallback: serve from avatar_data (base64 stored in DB)
    if (user.avatar_data) {
      try {
        // Parse data URL: "data:image/jpeg;base64,/9j/4AAQ..."
        const matches = user.avatar_data.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const base64Body = matches[2];
          const imgBuffer = Buffer.from(base64Body, 'base64');
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'public, max-age=300');
          return res.send(imgBuffer);
        }
      } catch (b64Err) {
        console.error('Avatar base64 decode error:', b64Err.message);
      }
    }

    // Fallback: if avatar_url is an external URL (e.g., Google profile pic), only redirect to trusted domains
    if (user.avatar_url && user.avatar_url.startsWith('http') && !user.avatar_url.includes('/api/avatar/')) {
      try {
        const avatarUrlParsed = new URL(user.avatar_url);
        const trustedHosts = ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'cdn.irlwork.ai'];
        if (trustedHosts.some(h => avatarUrlParsed.hostname === h || avatarUrlParsed.hostname.endsWith('.' + h))) {
          return res.redirect(user.avatar_url);
        }
      } catch {}
      return res.status(404).send('No avatar');
    }

    return res.status(404).send('No avatar');
  } catch (e) {
    console.error('Avatar serve error:', e.message);
    res.status(404).send('Not found');
  }
});

// Debug endpoint — check avatar storage status and test R2 fetch
app.get('/api/avatar/:userId/debug', async (req, res) => {
  // Require admin authentication for debug endpoints
  const debugUser = await getUserByToken(req.headers.authorization);
  if (!debugUser || !isAdmin(debugUser.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  const { data: user, error: dbErr } = await supabase.from('users').select('id, avatar_url, avatar_r2_key, avatar_data, updated_at').eq('id', req.params.userId).single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const getEnv = (k) => { try { return require('process').env[k]; } catch { return null; } };
  const R2_ACCOUNT_ID = getEnv('R2ID') || getEnv('CLOUD_ID') || getEnv('R2_ACCOUNT_ID');
  const R2_ACCESS_KEY = getEnv('R2KEY') || getEnv('CLOUD_KEY') || getEnv('R2_ACCESS_KEY');
  const R2_SECRET_KEY = getEnv('R2SECRET') || getEnv('CLOUD_SECRET') || getEnv('R2_SECRET_KEY');
  const R2_BUCKET = getEnv('R2BUCKET') || getEnv('CLOUD_BUCKET') || getEnv('R2_BUCKET') || 'irlwork-proofs';
  const hasR2 = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY);

  // Test R2 fetch if configured and key exists
  let r2_test = 'NOT_TESTED';
  if (hasR2 && user.avatar_r2_key) {
    try {
      const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      });
      const head = await s3Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: user.avatar_r2_key }));
      r2_test = `OK — ${head.ContentLength} bytes, type=${head.ContentType}`;
    } catch (r2Err) {
      r2_test = `FAILED — ${r2Err.name}: ${r2Err.message}`;
    }
  }

  // Test avatar_data decode
  let avatar_data_test = 'NOT_TESTED';
  if (user.avatar_data) {
    const matches = user.avatar_data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      try {
        const buf = Buffer.from(matches[2], 'base64');
        avatar_data_test = `OK — ${buf.length} bytes decoded, type=${matches[1]}`;
      } catch (e) {
        avatar_data_test = `DECODE_FAILED — ${e.message}`;
      }
    } else {
      avatar_data_test = `INVALID_FORMAT — starts with: ${user.avatar_data.substring(0, 50)}`;
    }
  }

  res.json({
    user_id: user.id,
    avatar_url: user.avatar_url || null,
    avatar_r2_key: user.avatar_r2_key || null,
    has_avatar_data: !!user.avatar_data,
    avatar_data_length: user.avatar_data ? user.avatar_data.length : 0,
    avatar_data_preview: user.avatar_data ? user.avatar_data.substring(0, 60) + '...' : null,
    updated_at: user.updated_at,
    r2_configured: hasR2,
    r2_bucket: R2_BUCKET,
    r2_test,
    avatar_data_test,
    diagnosis: !user.avatar_url ? 'NO_AVATAR_URL' :
               !user.avatar_r2_key && !user.avatar_data ? 'NO_STORAGE' :
               hasR2 && user.avatar_r2_key ? 'SHOULD_WORK_VIA_R2' :
               user.avatar_data ? 'SHOULD_WORK_VIA_DB' :
               'MISSING_BOTH_R2_AND_DB_DATA'
  });
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
  const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL') || getEnv('CLOUD_PUBLIC_URL');

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    const { file, filename, mimeType } = req.body;
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uniqueFilename = `feedback/${user.id}/${timestamp}-${randomStr}.${fileCheck.ext}`;
    const mockUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${uniqueFilename}` : `https://pub-r2.dev/${R2_BUCKET}/${uniqueFilename}`;
    console.log(`[R2 DEMO] Would upload feedback image to: ${mockUrl}`);
    return res.json({ url: mockUrl, filename: uniqueFilename, success: true, demo: true });
  }

  try {
    const { file, filename, mimeType } = req.body;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    // Validate file type
    const fileCheck = validateUploadFile(filename, mimeType);
    if (!fileCheck.valid) return res.status(400).json({ error: fileCheck.error });

    // Server-side file size validation (10MB max for feedback files)
    const base64Data = file.startsWith('data:') ? file.split(',')[1] : file;
    const fileSizeBytes = Buffer.byteLength(base64Data, 'base64');
    if (fileSizeBytes > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'File must be under 10MB' });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = fileCheck.ext;
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
        ContentDisposition: 'attachment',
      }));
      uploadSuccess = true;
    } catch (s3Error) {
      console.error('R2 feedback upload error:', s3Error.message);
    }

    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${uniqueFilename}` : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${uniqueFilename}`;
    res.json({ url: publicUrl, filename: uniqueFilename, success: uploadSuccess, demo: !uploadSuccess });
  } catch (e) {
    console.error('Feedback upload error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(500).json({ error: safeErrorMessage(error) });
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
    res.status(500).json({ error: 'Internal server error' });
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
      submitter:users!task_proofs_human_id_fkey(id, name)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
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
    .select('id, human_id, agent_id, status, title')
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
      proof_urls: Array.isArray(proof_urls) ? proof_urls.slice(0, 20).filter(u => typeof u === 'string') : [],
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
  
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
  dispatchWebhook(task.agent_id, {
    type: 'proof_submitted',
    task_id: taskId,
    data: {
      proof_id: proofId,
      human_id: user.id,
      human_name: user.name,
      task_title: task.title
    }
  }).catch(() => {});
  
  res.json({ success: true, proof });
});

app.post('/api/tasks/:id/reject', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const { id: taskId } = req.params;
  const { feedback, extend_deadline_hours: rawExtendHours = 24 } = req.body;
  const extend_deadline_hours = Math.max(1, Math.min(parseInt(rawExtendHours) || 24, 720));

  // Get task with current deadline
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, human:users!tasks_human_id_fkey(id, name)')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }

  // Only allow rejecting tasks in pending_review status
  if (task.status !== 'pending_review') {
    return res.status(400).json({ error: `Cannot reject proof on task with status "${task.status}". Task must be in pending_review.` });
  }

  // Revision system: max 2 revisions, tracked via revision_count (sole source of truth)
  const MAX_REVISIONS = 2;
  const currentRevisionCount = task.revision_count || 0;

  if (currentRevisionCount >= MAX_REVISIONS) {
    return res.status(409).json({
      error: 'max_revisions_reached',
      message: 'Maximum revisions reached (2). Please approve the work or open a dispute.',
      actions: ['approve', 'dispute'],
      revision_count: currentRevisionCount
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

  // Update proof status to 'rejected' (preserved for history)
  await supabase
    .from('task_proofs')
    .update({
      status: 'rejected',
      agent_feedback: feedback,
      updated_at: new Date().toISOString()
    })
    .eq('id', latestProof.id);

  // Atomic update: set status to in_progress, increment revision_count, store rejection_feedback
  // rejection_feedback is SEPARATE from instructions — human sees both
  const { data: rejectedTask, error: rejectErr } = await supabase
    .from('tasks')
    .update(cleanTaskData({
      status: 'in_progress',
      deadline: newDeadline.toISOString(),
      rejection_feedback: feedback,
      revision_count: currentRevisionCount + 1,
      deadline_warning_sent: false,
      updated_at: new Date().toISOString()
    }))
    .eq('id', taskId)
    .eq('status', 'pending_review')
    .select('id')
    .single();

  if (rejectErr || !rejectedTask) {
    return res.status(409).json({ error: 'Task status changed before rejection could complete.' });
  }

  // Increment total_rejections on human's user record
  if (task.human_id) {
    await supabase.rpc('increment_user_stat', {
      user_id_param: task.human_id, stat_name: 'total_rejections', increment_by: 1
    });
  }

  // Notify human
  await createNotification(
    task.human_id,
    'proof_rejected',
    'Revision Requested',
    `Your proof was rejected (${currentRevisionCount + 1}/${MAX_REVISIONS} revisions used). ${extend_deadline_hours > 0 ? `Deadline extended by ${extend_deadline_hours} hours.` : ''} Feedback: ${feedback || 'See details.'}`,
    `/tasks/${taskId}`
  );

  // Deliver webhook
  dispatchWebhook(task.agent_id, {
    type: 'proof_rejected',
    task_id: taskId,
    data: {
      proof_id: latestProof.id,
      feedback,
      revision_count: currentRevisionCount + 1,
      revisions_remaining: MAX_REVISIONS - (currentRevisionCount + 1),
      new_deadline: newDeadline.toISOString()
    }
  });

  res.json({
    success: true,
    message: `Proof rejected (revision ${currentRevisionCount + 1}/${MAX_REVISIONS}). Human can resubmit.`,
    revision_count: currentRevisionCount + 1,
    revisions_remaining: MAX_REVISIONS - (currentRevisionCount + 1),
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

  // Guard: task must be in pending_review or disputed status to approve
  if (!['pending_review', 'disputed'].includes(task.status)) {
    return res.status(400).json({ error: `Cannot approve task in '${task.status}' status` });
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

  // Atomic update with status precondition to prevent double-approval
  const { data: updatedProof, error: proofUpdateError } = await supabase
    .from('task_proofs')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', latestProof.id)
    .neq('status', 'approved')
    .select('id')
    .single();

  if (proofUpdateError || !updatedProof) {
    return res.status(409).json({ error: 'Proof has already been approved' });
  }

  // Atomic task status update with precondition
  const { data: updatedTask, error: taskUpdateError } = await supabase
    .from('tasks')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .in('status', ['pending_review', 'disputed'])
    .select('id')
    .single();

  if (taskUpdateError || !updatedTask) {
    return res.status(409).json({ error: 'Task has already been approved' });
  }

  // Notify human
  await createNotification(
    task.human_id,
    'proof_approved',
    'Proof Approved!',
    `Your proof for "${task.title}" has been approved! Payment is being processed.`,
    `/tasks/${taskId}`
  );

  // Email notification for task approval
  const approveTaskUrl = `https://www.irlwork.ai/tasks/${taskId}`;
  sendEmailNotification(task.human_id,
    `Your work on "${task.title}" has been approved!`,
    `<div style="background: #D1FAE5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p style="color: #059669; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Work Approved!</p>
      <p style="color: #1A1A1A; font-size: 14px; margin: 0;">Your work on "${task.title}" has been approved. $${task.budget} is being processed and will be available after the 48-hour clearing period.</p>
    </div>
    <a href="${approveTaskUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Task</a>`
  ).catch(() => {});

  // Deliver webhook to agent
  dispatchWebhook(task.agent_id, {
    type: 'proof_approved',
    task_id: taskId,
    data: {
      proof_id: latestProof.id,
      message: 'Proof approved. Payment will be processed.'
    }
  });

  // Stripe-paid tasks: auto-release to pending balance (no admin step needed)
  if (task.stripe_payment_intent_id) {
    try {
      await releasePaymentToPending(supabase, taskId, task.human_id, task.agent_id, createNotification);
      console.log(`[Approve] Auto-released payment for Stripe task ${taskId}`);
    } catch (releaseError) {
      console.error('[Approve] Auto-release failed for Stripe task:', releaseError.message);
      // Don't fail the approve — admin can manually release if auto-release fails
    }
  } else if (task.payment_method === 'usdc' && (task.escrow_status === 'deposited' || task.escrow_status === 'held')) {
    // USDC-paid tasks: release to pending balance if escrow was deposited on-chain
    try {
      await releasePaymentToPending(supabase, taskId, task.human_id, task.agent_id, createNotification);
      console.log(`[Approve] Released USDC payment for task ${taskId}`);
    } catch (releaseError) {
      console.error('[Approve] USDC release failed for task:', releaseError.message);
      // Don't fail the approve — admin can manually release
    }
  } else {
    // Non-Stripe, non-USDC: flag for manual processing + notify admins
    await supabase.from('tasks').update({
      requires_manual_payment: true, updated_at: new Date().toISOString()
    }).eq('id', taskId);

    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
    for (const adminId of adminIds) {
      await createNotification(adminId.trim(), 'manual_payment_required', 'Manual Payment Required',
        `Task "${task.title}" (${taskId}) approved but requires manual payment processing.`,
        `/admin/tasks/${taskId}`);
    }
    console.warn(`[Approve] Task ${taskId} approved — manual payment required, ${adminIds.length} admins notified`);
  }

  res.json({
    success: true,
    status: 'approved',
    payment_method: task.stripe_payment_intent_id ? 'stripe' : (task.payment_method || 'manual'),
    message: task.stripe_payment_intent_id
      ? 'Proof approved. Payment released to pending balance with 48-hour hold.'
      : 'Proof approved. Payment will be processed.'
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

  // Create disputes table record
  const filedAgainst = user.id === task.human_id ? task.agent_id : task.human_id;
  const disputeId = uuidv4();
  await supabase.from('disputes').insert({
    id: disputeId,
    task_id: taskId,
    filed_by: user.id,
    filed_against: filedAgainst,
    reason: reason,
    status: 'open',
    created_at: new Date().toISOString()
  });

  // Freeze payout if exists
  await supabase.from('payouts')
    .update({ status: 'frozen', updated_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .in('status', ['pending', 'available']);

  // Increment total_disputes_filed on the filing party
  await supabase.rpc('increment_user_stat', {
    user_id_param: user.id, stat_name: 'total_disputes_filed', increment_by: 1
  });

  // Notify relevant parties
  const notifyTo = user.id === task.human_id ? task.agent_id : task.human_id;
  await createNotification(
    notifyTo,
    'dispute_opened',
    'Dispute Opened',
    `A dispute has been opened for task "${task.title}". Reason: ${reason}`,
    `/tasks/${taskId}`
  );

  // Email notification to both parties about the dispute
  const disputeTaskUrl = `https://www.irlwork.ai/tasks/${taskId}`;
  const disputeEmailBody = `<div style="background: #FEE2E2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
    <p style="color: #DC2626; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Dispute Opened</p>
    <p style="color: #1A1A1A; font-size: 14px; margin: 0;">A dispute has been opened for task "${task.title}".</p>
    <p style="color: #525252; font-size: 13px; margin: 8px 0 0 0;">Reason: ${reason}</p>
  </div>
  <p style="font-size: 13px; color: #525252; margin-bottom: 16px;">Our team will review the evidence and make a fair decision.</p>
  <a href="${disputeTaskUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Task</a>`;
  sendEmailNotification(task.human_id, `Dispute opened on "${task.title}"`, disputeEmailBody).catch(() => {});
  sendEmailNotification(task.agent_id, `Dispute opened on "${task.title}"`, disputeEmailBody).catch(() => {});

  // Deliver webhook
  dispatchWebhook(task.agent_id, {
    type: 'dispute_opened',
    task_id: taskId,
    data: {
      dispute_id: disputeId,
      disputed_by: user.id,
      reason
    }
  });

  res.json({ success: true, status: 'disputed', dispute_id: disputeId });
});

// ============ ADMIN DISPUTE RESOLUTION ============
// DEPRECATED: Use POST /api/disputes/:id/resolve instead
app.post('/api/admin/resolve-dispute', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Check if user is admin via ADMIN_USER_IDS environment variable
  const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (!ADMIN_USER_IDS.includes(user.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { task_id, resolution, refund_to_agent = false, release_to_human = false, notes,
          // Support legacy parameter name for backwards compatibility
          refund_human } = req.body;
  const shouldRefundAgent = refund_to_agent || refund_human;

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
    const escrowCents = Math.round(escrowAmount * 100);
    const workerFeePercent = task.worker_fee_percent != null ? task.worker_fee_percent : PLATFORM_FEE_PERCENT;
    const platformFeeCents = Math.round(escrowCents * workerFeePercent / 100);
    const platformFee = platformFeeCents / 100;
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
  } else if (shouldRefundAgent) {
    // Refund escrow to agent (param was misleadingly named refund_human, now refund_to_agent)
    const { data: refundResult, error: refundError } = await supabase
      .from('tasks')
      .update({
        status: 'cancelled',
        escrow_status: 'refunded',
        escrow_refunded_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .eq('status', 'disputed')
      .select('id')
      .single();

    if (refundError || !refundResult) {
      return res.status(409).json({ error: 'Dispute has already been resolved.' });
    }

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
    const { data: partialResult, error: partialError } = await supabase
      .from('tasks')
      .update({
        status: 'pending_review',
        proof_submitted_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id)
      .eq('status', 'disputed')
      .select('id')
      .single();

    if (partialError || !partialResult) {
      return res.status(409).json({ error: 'Dispute has already been resolved.' });
    }
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

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  res.json({ success: true, webhook_url });
});

// Get current webhook configuration
app.get('/api/webhooks', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('users')
    .select('webhook_url, webhook_secret')
    .eq('id', user.id)
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  res.json({
    webhook_url: data?.webhook_url || null,
    has_secret: !!data?.webhook_secret
  });
});

// Test webhook delivery — sends a test event to the caller's registered webhook URL
app.post('/api/webhooks/test', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = await supabase
    .from('users')
    .select('webhook_url, webhook_secret')
    .eq('id', user.id)
    .single();

  if (!data?.webhook_url) {
    return res.status(400).json({ error: 'No webhook URL configured. Register one first via POST /api/webhooks/register.' });
  }

  if (!isValidWebhookUrl(data.webhook_url)) {
    return res.status(400).json({ error: 'Registered webhook URL is invalid.' });
  }

  const payload = {
    event_type: 'test',
    task_id: null,
    data: { message: 'Webhook test from irlwork.ai. If you receive this, your webhook is working correctly.' },
    timestamp: new Date().toISOString()
  };

  const headers = { 'Content-Type': 'application/json' };
  if (data.webhook_secret) {
    const signature = crypto
      .createHmac('sha256', data.webhook_secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['X-Webhook-Signature'] = signature;
  }

  try {
    const response = await fetch(data.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    res.json({
      success: true,
      webhook_url: data.webhook_url,
      status_code: response.status,
      delivered: response.ok
    });
  } catch (err) {
    res.json({
      success: false,
      webhook_url: data.webhook_url,
      error: err.message,
      delivered: false
    });
  }
});

// Webhook delivery history — paginated list of webhook delivery attempts
app.get('/api/webhooks/deliveries', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status; // optional: pending, delivered, failed, exhausted

  let query = supabase
    .from('webhook_deliveries')
    .select('id, event_type, payload, status, attempts, max_attempts, next_retry_at, last_error, created_at, delivered_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: deliveries, error, count } = await query;

  if (error) {
    if (error.message?.includes('does not exist')) {
      return res.json({ deliveries: [], total: 0, page, limit });
    }
    return res.status(500).json({ error: safeErrorMessage(error) });
  }

  res.json({ deliveries: deliveries || [], total: count || 0, page, limit });
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

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
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
  
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
  res.json(payouts || []);
});

// ============ WEBHOOKS ============
app.post('/webhooks/receive', async (req, res) => {
  // Agent webhook endpoint - receives notifications
  // API key must be in Authorization header, not URL path (prevents key leaking in logs/referers)
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const apiKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { event, data } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required in Authorization header' });
  }

  // Verify agent exists via hashed API key lookup
  const agent = await getUserByToken(apiKey);
  if (!agent || agent.type !== 'agent') {
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

app.get('/webhooks/test', async (req, res) => {
  const apiKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!apiKey) return res.status(401).json({ error: 'API key required in Authorization header' });

  const agent = await getUserByToken(apiKey);
  if (!agent || agent.type !== 'agent') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  res.json({
    status: 'ok',
    agent: agent.name,
    webhook_url: '/webhooks/receive'
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
// Dedicated MCP rate limit: 60 requests/min per API key
const mcpRateLimitStore = new Map();
function mcpRateLimit(req, res) {
  const key = getRateLimitKey(req);
  const mcpKey = `mcp:${key}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;
  let record = mcpRateLimitStore.get(mcpKey);
  if (record && now - record.windowStart > windowMs) record = null;
  if (!record) { record = { count: 0, windowStart: now }; mcpRateLimitStore.set(mcpKey, record); }
  record.count++;
  if (record.count > maxRequests) {
    const resetAt = new Date(record.windowStart + windowMs);
    res.status(429).json({ error: 'MCP rate limit exceeded', limit: maxRequests, retry_after_seconds: Math.ceil((resetAt.getTime() - now) / 1000) });
    return false;
  }
  return true;
}

app.post('/api/mcp', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const apiKey = req.headers.authorization || req.headers['x-api-key'];
  const user = await getUserByToken(apiKey);

  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Apply MCP-specific rate limit (60/min per key)
  if (!mcpRateLimit(req, res)) return;

  try {
    const { method, params = {} } = req.body;
    
    switch (method) {
      case 'list_humans': {
        let query = supabase
          .from('users')
          .select('id, name, city, state, hourly_rate, skills, rating, jobs_completed, bio, languages, travel_radius, availability, headline, timezone')
          .eq('type', 'human');

        // Default to only showing available workers unless explicitly requesting all
        query = query.eq('availability', params.availability || 'available');

        if (params.category) query = query.like('skills', `%${escapeLike(params.category)}%`);
        if (params.city) query = query.like('city', `%${escapeLike(params.city)}%`);
        if (params.state) query = query.ilike('state', `%${escapeLike(params.state)}%`);
        if (params.min_rating) query = query.gte('rating', parseFloat(params.min_rating));
        if (params.language) query = query.contains('languages', JSON.stringify([params.language]));

        const { data: humans, error } = await query.limit(params.limit || 100);
        if (error) throw error;

        res.json(humans?.map(h => ({
          ...h,
          skills: safeParseJsonArray(h.skills),
          languages: safeParseJsonArray(h.languages)
        })) || []);
        break;
      }
      
      case 'get_human': {
        if (!params.human_id) {
          return res.status(400).json({ error: 'human_id is required' });
        }
        const { data: human, error } = await supabase
          .from('users')
          .select('id, name, bio, hourly_rate, skills, rating, jobs_completed, city, state, country, availability, travel_radius, languages, headline, timezone, avatar_url, type')
          .eq('id', params.human_id)
          .single();

        if (error) {
          return res.status(404).json({ error: 'Human not found' });
        }
        res.json({ ...human, skills: safeParseJsonArray(human.skills) });
        break;
      }
      
      case 'hire_human': {
        // Hiring sends an offer to the human — card is NOT charged until they accept
        const { task_id, human_id, deadline_hours = 24, instructions } = params;

        const { data: taskData, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();

        if (fetchError || !taskData) throw new Error('Task not found');

        // Agent must have a payment method before hiring
        const { listPaymentMethods } = require('./backend/services/stripeService');
        if (!user.stripe_customer_id) {
          return res.status(402).json({
            error: 'No payment method on file',
            code: 'payment_required',
            message: 'Use the setup_payment tool to add a credit card or configure USDC.',
            actions: [
              { tool: 'setup_payment', params: { method: 'stripe' }, label: 'Add credit card' },
              { tool: 'setup_payment', params: { method: 'usdc' }, label: 'Set up USDC' }
            ]
          });
        }
        let agentCards = [];
        try {
          agentCards = await listPaymentMethods(user.stripe_customer_id);
        } catch (e) {
          console.error('[MCP Hire] Failed to list payment methods:', e.message);
        }
        if (agentCards.length === 0 && !user.wallet_address) {
          return res.status(402).json({
            error: 'No payment method on file',
            code: 'payment_required',
            message: 'Use the setup_payment tool to add a credit card or configure USDC.',
            actions: [
              { tool: 'setup_payment', params: { method: 'stripe' }, label: 'Add credit card' },
              { tool: 'setup_payment', params: { method: 'usdc' }, label: 'Set up USDC' }
            ]
          });
        }

        // Multi-hire support
        const isOpen = taskData.task_type === 'open';
        const maxQuantity = taskData.quantity || 1;
        const currentHumanIds = Array.isArray(taskData.human_ids) ? taskData.human_ids : [];

        if (currentHumanIds.includes(human_id)) {
          throw new Error('This human is already assigned to this task');
        }
        if (isOpen && currentHumanIds.length >= maxQuantity) {
          throw new Error(`All ${maxQuantity} spots are already filled`);
        }

        const updatedHumanIds = [...currentHumanIds, human_id];
        const newSpotsFilled = updatedHumanIds.length;
        const allSpotsFilled = newSpotsFilled >= maxQuantity;

        const budgetAmount = taskData.escrow_amount || taskData.budget || 50;
        const deadline = new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString();
        // 24-hour review window for the human to accept/decline
        const reviewDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Set task to pending_acceptance — NO charge yet
        const { data: updatedMcpTask, error: taskError } = await supabase
          .from('tasks')
          .update(cleanTaskData({
            human_id: isOpen ? (updatedHumanIds[0] || human_id) : human_id,
            human_ids: updatedHumanIds,
            spots_filled: newSpotsFilled,
            status: 'pending_acceptance',
            escrow_status: 'unfunded',
            escrow_amount: budgetAmount,
            payment_method: 'stripe',
            review_deadline: reviewDeadline,
            deadline,
            instructions,
            updated_at: new Date().toISOString()
          }))
          .eq('id', task_id)
          .eq('status', 'open')
          .select('id')
          .single();

        if (taskError || !updatedMcpTask) {
          return res.status(409).json({ error: 'Task is no longer available — it may have already been assigned' });
        }

        await createNotification(
          human_id,
          'task_offered',
          'New Task Offer!',
          `You've been offered "${taskData.title}" ($${budgetAmount}). You have 24 hours to accept or decline.`,
          `/tasks/${task_id}`
        );

        res.json({
          success: true,
          status: 'pending_acceptance',
          review_deadline: reviewDeadline,
          deadline,
          escrow_status: 'unfunded',
          payment_method: 'stripe',
          spots_filled: newSpotsFilled,
          spots_remaining: Math.max(0, maxQuantity - newSpotsFilled),
          message: 'Offer sent to the human. They have 24 hours to accept or decline. Your card will only be charged if they accept.'
        });
        break;
      }
      
      case 'get_task_status': {
        if (!params.task_id) return res.status(400).json({ error: 'task_id is required' });
        let statusSelect = 'id, status, escrow_status, escrow_amount, escrow_deposited_at, task_type, quantity, human_ids, creator_id';
        if (taskColumnFlags.spots_filled) statusSelect += ', spots_filled';
        const { data: task, error } = await supabase
          .from('tasks')
          .select(statusSelect)
          .eq('id', params.task_id)
          .single();

        if (error) throw error;
        // Ownership check: only task creator or assigned humans can see status
        if (task.creator_id !== user.id && !(Array.isArray(task.human_ids) && task.human_ids.includes(user.id))) {
          return res.status(403).json({ error: 'Not authorized to view this task' });
        }
        // Add computed fields, strip internal fields
        const spots = task.spots_filled || (Array.isArray(task.human_ids) ? task.human_ids.length : 0);
        const { creator_id: _c, human_ids: _h, ...safeTask } = task;
        res.json({
          ...safeTask,
          spots_filled: spots,
          spots_remaining: Math.max(0, (task.quantity || 1) - spots)
        });
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
          proof_urls: Array.isArray(proof_urls) ? proof_urls.slice(0, 20).filter(u => typeof u === 'string') : [],
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

        // Dispatch webhook to agent (parity with REST POST /api/tasks/:id/submit-proof)
        dispatchWebhook(task.agent_id, {
          type: 'proof_submitted',
          task_id: task_id,
          data: {
            proof_id: proofId,
            human_id: user.id,
            human_name: user.name,
            task_title: task.title
          }
        }).catch(() => {});

        res.json({ success: true, status: 'pending_review', proof_id: proofId });
        break;
      }

      // ===== Approve & release payment (canonical: approve_task) =====
      case 'release_payment':
      case 'release_escrow':
      case 'approve_task': {
        const task_id = params.task_id || params.booking_id;

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

        // Align with REST endpoint: allow pending_review and disputed
        if (!['pending_review', 'disputed'].includes(task.status)) {
          return res.status(400).json({ error: `Cannot approve task with status "${task.status}"` });
        }

        // Get latest proof
        const { data: latestProof } = await supabase
          .from('task_proofs')
          .select('id')
          .eq('task_id', task_id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single();

        // Atomic proof status update — prevents double-approve
        if (latestProof) {
          await supabase
            .from('task_proofs')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', latestProof.id)
            .neq('status', 'approved');
        }

        // Atomic status transition — prevents double-approve
        const { data: approvedTask, error: approveErr } = await supabase
          .from('tasks')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', task_id)
          .in('status', ['pending_review', 'disputed'])
          .select('id')
          .single();

        if (approveErr || !approvedTask) {
          return res.status(409).json({ error: 'Task status changed — refresh and try again' });
        }

        // Release payment (both Stripe and USDC tasks with funded escrow)
        const canRelease = (task.payment_method === 'stripe' && task.stripe_payment_intent_id) ||
          (task.payment_method === 'usdc' && (task.escrow_status === 'deposited' || task.escrow_status === 'held'));

        if (canRelease) {
          try {
            await releasePaymentToPending(supabase, task_id, task.human_id, user.id, createNotification);
            console.log(`[MCP Approve] Released payment for task ${task_id}`);
          } catch (e) {
            return res.status(409).json({ error: e.message || 'Payment release failed.' });
          }
        }

        const escrowAmount = task.escrow_amount || task.budget || 50;
        const escrowCents = Math.round(escrowAmount * 100);
        const workerFeePercent = task.worker_fee_percent != null ? task.worker_fee_percent : PLATFORM_FEE_PERCENT;
        const platformFeeCents = Math.round(escrowCents * workerFeePercent / 100);
        const netAmount = (escrowCents - platformFeeCents) / 100;

        res.json({
          success: true,
          status: 'approved',
          payment_released: canRelease,
          payment_method: task.payment_method || 'stripe',
          net_amount: canRelease ? netAmount : null,
          message: canRelease
            ? 'Proof approved. Payment released to pending balance with 48-hour hold.'
            : 'Proof approved. Payment will be released once escrow is funded.'
        });
        break;
      }
      
      case 'get_task_details': {
        if (!params.task_id) {
          return res.status(400).json({ error: 'task_id is required' });
        }
        const { data: task, error } = await supabase
          .from('tasks')
          .select(`
            *,
            human:users!tasks_human_id_fkey(id, name, rating),
            agent:users!tasks_agent_id_fkey(id, name)
          `)
          .eq('id', params.task_id)
          .single();

        if (error) throw error;
        if (!task) return res.status(404).json({ error: 'Task not found' });
        // Only return full details to task owner or participants
        if (task.agent_id !== user.id && task.human_id !== user.id &&
            !(Array.isArray(task.human_ids) && task.human_ids.includes(user.id))) {
          return res.status(403).json({ error: 'Access denied' });
        }
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
          .select('id, name')
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

        // Send initial message if provided (validate like send_message)
        if (messageContent && typeof messageContent === 'string' && messageContent.trim()) {
          if (messageContent.length > 10000) {
            return res.status(400).json({ error: 'Message content is too long (max 10,000 characters)' });
          }
          const messageId = uuidv4();
          await supabase.from('messages').insert({
            id: messageId,
            conversation_id: conversationId,
            sender_id: user.id,
            content: messageContent,
            created_at: new Date().toISOString()
          });

          // Update conversation preview
          const preview = messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent;
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString(), last_message: preview })
            .eq('id', conversationId);

          // Notify the human about the new message
          await createNotification(
            targetHumanId,
            'new_message',
            'New message',
            `New message from ${user.name || 'an agent'}: ${preview}`,
            `/tasks/${conversationId}`
          );

          // Email handled by createNotification → notificationService pipeline

          // Dispatch webhook to human
          dispatchWebhook(targetHumanId, {
            type: 'new_message',
            task_id: null,
            data: {
              conversation_id: conversationId,
              message_id: messageId,
              sender_name: user.name,
              sender_type: 'agent',
              content: messageContent,
              created_at: new Date().toISOString()
            }
          }).catch(() => {});
        }

        res.json({
          conversation_id: conversationId,
          human: { id: human.id, name: human.name },
          message: messageContent ? 'Conversation started with initial message' : 'Conversation started'
        });
        break;
      }

      // ===== Task creation (canonical: create_posting) =====
      case 'post_task':
      case 'create_posting':
      case 'create_adhoc_task': {
        // Create a public posting for humans to apply to
        if (!params.title) return res.status(400).json({ error: 'title is required' });
        if (!params.duration_hours || isNaN(parseFloat(params.duration_hours)) || parseFloat(params.duration_hours) <= 0) {
          return res.status(400).json({ error: 'duration_hours is required and must be a positive number (estimated hours to complete the task)' });
        }
        if (parseFloat(params.duration_hours) > 720) {
          return res.status(400).json({ error: 'duration_hours cannot exceed 720 (30 days)' });
        }

        // Payment method check: agent must have a card or wallet before creating a task
        let mcpCreatePMs = [];
        if (user.stripe_customer_id && stripe) {
          try {
            mcpCreatePMs = await listPaymentMethods(user.stripe_customer_id);
          } catch (e) {
            console.error('[MCP/create_posting] Failed to check payment methods:', e.message);
          }
        }
        if (mcpCreatePMs.length === 0 && !user.wallet_address) {
          return res.status(402).json({
            error: 'No payment method on file',
            code: 'payment_required',
            message: 'Use the setup_payment tool to add a credit card or configure USDC.',
            actions: [
              { tool: 'setup_payment', params: { method: 'stripe' }, label: 'Add credit card' },
              { tool: 'setup_payment', params: { method: 'usdc' }, label: 'Set up USDC' }
            ]
          });
        }

        // Run validation pipeline if task_type_id is provided
        const { proceed: mcpProceed, flagged: mcpTaskFlagged, errorResponse: mcpErrorResponse } = await runTaskValidation(supabase, params, user.id);
        if (!mcpProceed) return res.status(422).json(mcpErrorResponse);

        const id = uuidv4();
        const budgetAmount = params.budget || params.budget_usd || params.budget_max || params.budget_min || 50;
        const taskType = params.task_type === 'open' ? 'open' : 'direct';
        const taskQuantity = taskType === 'open' ? Math.max(1, parseInt(params.quantity) || 1) : 1;

        // Encrypt private fields
        let mcpEncAddr = null, mcpEncNotes = null, mcpEncContact = null;
        try {
          if (params.private_address) mcpEncAddr = encryptField(params.private_address);
          if (params.private_notes) mcpEncNotes = encryptField(params.private_notes);
          if (params.private_contact) mcpEncContact = encryptField(params.private_contact);
        } catch (encErr) {
          console.error('[MCP/create_posting] Encryption error:', encErr.message);
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .insert(buildTaskInsertData({
            id,
            agent_id: user.id,
            title: params.title,
            description: params.description,
            category: params.category || (params.task_type_id ? params.task_type_id : 'other'),
            location: params.location || params.location_zone || null,
            latitude: params.latitude || null,
            longitude: params.longitude || null,
            budget: budgetAmount,
            status: mcpTaskFlagged ? 'pending_review' : 'open',
            task_type: taskType,
            quantity: taskQuantity,
            human_ids: [],
            escrow_amount: budgetAmount,
            is_remote: !!params.is_remote,
            task_type_id: params.task_type_id || null,
            location_zone: params.location_zone || null,
            private_address: mcpEncAddr,
            private_notes: mcpEncNotes,
            private_contact: mcpEncContact,
            created_at: new Date().toISOString()
          }, {
            is_anonymous: !!params.is_anonymous,
            duration_hours: parseFloat(params.duration_hours),
          }))
          .select()
          .single();

        if (error) throw error;
        const mcpResponse = { id: task.id, status: mcpTaskFlagged ? 'pending_review' : 'open', task_type: taskType, quantity: taskQuantity, message: 'Task posted successfully.' };
        if (mcpEncAddr || mcpEncNotes || mcpEncContact) {
          mcpResponse.private_fields_stored = [];
          if (mcpEncAddr) mcpResponse.private_fields_stored.push('private_address');
          if (mcpEncNotes) mcpResponse.private_fields_stored.push('private_notes');
          if (mcpEncContact) mcpResponse.private_fields_stored.push('private_contact');
          mcpResponse.note = 'Private fields will be released to the assigned worker upon task acceptance';
        }
        res.json(mcpResponse);
        break;
      }

      case 'assign_human': {
        const { task_id, human_id, deadline_hours = 24, instructions } = params;

        const { data: taskData, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();

        if (fetchError || !taskData) throw new Error('Task not found');
        if (taskData.status !== 'open' && taskData.status !== 'assigned') {
          throw new Error('Task is not available for assignment');
        }

        // Multi-hire support
        const isOpen = taskData.task_type === 'open';
        const maxQuantity = taskData.quantity || 1;
        const currentHumanIds = Array.isArray(taskData.human_ids) ? taskData.human_ids : [];

        if (currentHumanIds.includes(human_id)) {
          throw new Error('This human is already assigned to this task');
        }
        if (isOpen && currentHumanIds.length >= maxQuantity) {
          throw new Error(`All ${maxQuantity} spots are already filled`);
        }

        const updatedHumanIds = [...currentHumanIds, human_id];
        const newSpotsFilled = updatedHumanIds.length;
        const allSpotsFilled = newSpotsFilled >= maxQuantity;

        const budgetAmount = taskData.escrow_amount || taskData.budget || 50;
        // Work in integer cents to avoid floating-point precision loss
        const randomCents = Math.floor(Math.random() * 99) + 1;
        const budgetCents = Math.round(budgetAmount * 100);
        const uniqueDepositAmount = (budgetCents + randomCents) / 100;
        const deadline = new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString();

        // For open tasks with spots remaining, keep task open
        const nextStatus = isOpen && !allSpotsFilled ? 'open' : 'assigned';

        const { error: taskError } = await supabase
          .from('tasks')
          .update(cleanTaskData({
            human_id: isOpen ? (updatedHumanIds[0] || human_id) : human_id,
            human_ids: updatedHumanIds,
            spots_filled: newSpotsFilled,
            status: nextStatus,
            escrow_status: 'pending_deposit',
            unique_deposit_amount: uniqueDepositAmount,
            deposit_amount_cents: budgetCents + randomCents,
            assigned_at: new Date().toISOString(),
            deadline,
            instructions,
            updated_at: new Date().toISOString()
          }))
          .eq('id', task_id);

        if (taskError) throw taskError;

        await createNotification(
          human_id,
          'task_assigned',
          'You\'ve Been Selected!',
          `You've been selected for "${taskData.title}". Funding is in progress.`,
          `/tasks/${task_id}`
        );

        // Dispatch webhook to human about the assignment
        dispatchWebhook(human_id, {
          type: 'task_assigned',
          task_id: task_id,
          data: {
            title: taskData.title,
            budget: taskData.budget,
            agent_id: user.id
          }
        }).catch(() => {});

        res.json({
          success: true,
          assigned_at: new Date().toISOString(),
          deadline,
          escrow_status: 'pending_deposit',
          spots_filled: newSpotsFilled,
          spots_remaining: Math.max(0, maxQuantity - newSpotsFilled),
          deposit_instructions: {
            wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
            amount_usdc: uniqueDepositAmount,
            network: 'Base',
            note: 'Send exactly this amount. Your human will be notified once deposit is confirmed.'
          },
          message: isOpen && !allSpotsFilled
            ? `Human assigned (${newSpotsFilled}/${maxQuantity} spots filled). Task remains open.`
            : 'Human selected. Please send the exact USDC amount to complete the assignment.'
        });
        break;
      }

      // ===== Messaging tools =====
      case 'send_message': {
        const { conversation_id, content } = params;
        if (!conversation_id || !content || typeof content !== 'string' || !content.trim()) {
          return res.status(400).json({ error: 'conversation_id and content are required' });
        }
        if (content.length > 10000) {
          return res.status(400).json({ error: 'Message content is too long (max 10,000 characters)' });
        }

        // Per-conversation rate limit check
        const msgRateCheck = checkMessageRateLimit(user.id, conversation_id);
        if (!msgRateCheck.allowed) {
          return res.status(429).json({
            error: 'Message rate limit exceeded. Please slow down.',
            retry_after_seconds: msgRateCheck.retryAfterSeconds
          });
        }

        // Verify access to conversation (include task_id and task title for notifications)
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('id, human_id, agent_id, task_id, tasks(title)')
          .eq('id', conversation_id)
          .single();

        if (convError || !conv) return res.status(404).json({ error: 'Conversation not found' });
        if (conv.human_id !== user.id && conv.agent_id !== user.id) {
          return res.status(403).json({ error: 'Not your conversation' });
        }

        const messageId = uuidv4();
        const { data: msg, error: msgError } = await supabase.from('messages').insert({
          id: messageId,
          conversation_id,
          sender_id: user.id,
          content,
          created_at: new Date().toISOString()
        }).select().single();

        if (msgError) throw msgError;

        // Update conversation's updated_at and last_message preview
        const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString(), last_message: preview })
          .eq('id', conversation_id);

        // Notify other party
        const recipientId = conv.human_id === user.id ? conv.agent_id : conv.human_id;
        if (recipientId) {
          const taskTitle = conv.tasks?.title || 'a task';
          await createNotification(
            recipientId,
            'new_message',
            'New message',
            `New message about "${taskTitle}": ${preview}`,
            `/tasks/${conv.task_id}?conversation=${conversation_id}`
          );

          // Email handled by createNotification → notificationService pipeline

          // Dispatch webhook to other party
          dispatchWebhook(recipientId, {
            type: 'new_message',
            task_id: conv.task_id,
            data: {
              conversation_id,
              message_id: msg.id,
              sender_name: user.name,
              sender_type: user.type || 'agent',
              content,
              created_at: msg.created_at
            }
          }).catch(() => {});
        }

        res.json(msg);
        break;
      }

      case 'get_messages': {
        const { conversation_id, since } = params;
        if (!conversation_id) {
          return res.status(400).json({ error: 'conversation_id is required' });
        }

        // Verify access
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('id, human_id, agent_id')
          .eq('id', conversation_id)
          .single();

        if (convError || !conv) return res.status(404).json({ error: 'Conversation not found' });
        if (conv.human_id !== user.id && conv.agent_id !== user.id) {
          return res.status(403).json({ error: 'Not your conversation' });
        }

        let query = supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .eq('conversation_id', conversation_id)
          .order('created_at', { ascending: true });

        if (since) {
          query = query.gt('created_at', since);
        }

        const { data: messages, error } = await query.limit(100);
        if (error) throw error;
        res.json(messages || []);
        break;
      }

      case 'get_unread_summary': {
        try {
          const { data, error } = await supabase.rpc('get_unread_summary', { p_user_id: user.id });
          if (error) throw error;
          res.json(data || { unread_count: 0 });
        } catch (e) {
          // Fallback if RPC doesn't exist
          res.json({ unread_count: 0, message: 'Unread summary unavailable' });
        }
        break;
      }

      // ===== Task applicants & proofs =====
      case 'get_applicants': {
        const { task_id } = params;
        if (!task_id) return res.status(400).json({ error: 'task_id is required' });

        // Verify ownership
        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .select('agent_id')
          .eq('id', task_id)
          .single();

        if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });
        if (task.agent_id !== user.id) return res.status(403).json({ error: 'Not your task' });

        const { data: applications, error } = await supabase
          .from('task_applications')
          .select('*, applicant:users!task_applications_human_id_fkey(id, name, hourly_rate, rating, jobs_completed, bio, city)')
          .eq('task_id', task_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(applications || []);
        break;
      }

      case 'view_proof': {
        const { task_id } = params;
        if (!task_id) return res.status(400).json({ error: 'task_id is required' });

        // Verify access
        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .select('agent_id, human_id')
          .eq('id', task_id)
          .single();

        if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });
        if (task.agent_id !== user.id && task.human_id !== user.id) {
          return res.status(403).json({ error: 'Not your task' });
        }

        const { data: proofs, error } = await supabase
          .from('task_proofs')
          .select('*, submitter:users!task_proofs_human_id_fkey(id, name)')
          .eq('task_id', task_id)
          .order('submitted_at', { ascending: false });

        if (error) throw error;
        res.json(proofs || []);
        break;
      }

      // ===== Disputes & Feedback =====
      case 'dispute_task': {
        const { task_id, reason, category: disputeCategory, evidence_urls } = params;
        if (!task_id || !reason) {
          return res.status(400).json({ error: 'task_id and reason are required' });
        }

        // Verify task ownership
        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task_id)
          .single();

        if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });
        if (task.agent_id !== user.id) return res.status(403).json({ error: 'Not your task' });

        // Enforce same status restrictions as REST endpoint
        const disputeableStatuses = ['in_progress', 'pending_review', 'approved'];
        if (!disputeableStatuses.includes(task.status)) {
          return res.status(400).json({
            error: `Cannot dispute a task with status "${task.status}". Only active tasks can be disputed.`
          });
        }

        // Check for existing open dispute
        const { data: existingDisputes } = await supabase
          .from('disputes')
          .select('id, status')
          .eq('task_id', task_id)
          .eq('filed_by', user.id);

        if (existingDisputes && existingDisputes.length > 0) {
          return res.status(409).json({ error: 'Dispute already filed for this task', dispute_id: existingDisputes[0].id });
        }

        const disputeId = uuidv4();
        const { data: dispute, error: disputeError } = await supabase
          .from('disputes')
          .insert({
            id: disputeId,
            task_id,
            filed_by: user.id,
            reason,
            category: disputeCategory || 'quality_issue',
            evidence_urls: Array.isArray(evidence_urls) ? evidence_urls.slice(0, 10).filter(u => typeof u === 'string') : [],
            status: 'open',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (disputeError) throw disputeError;

        // Notify human
        if (task.human_id) {
          await createNotification(
            task.human_id,
            'dispute_filed',
            'Dispute Filed',
            `A dispute has been filed for "${task.title}".`,
            `/tasks/${task_id}`
          );
        }

        res.json(dispute);
        break;
      }

      case 'submit_feedback': {
        const { message: feedbackMsg, comment, type: feedbackType, urgency, subject, image_urls, page_url } = params;
        const feedbackText = feedbackMsg || comment;
        if (!feedbackText) {
          return res.status(400).json({ error: 'message or comment is required' });
        }

        const validFeedbackTypes = ['feedback', 'bug', 'feature_request', 'other'];
        const resolvedType = feedbackType || 'feedback';
        if (!validFeedbackTypes.includes(resolvedType)) {
          return res.status(400).json({ error: `Type must be one of: ${validFeedbackTypes.join(', ')}. To rate a worker on a task, use the rate_task method instead.` });
        }

        const feedbackId = uuidv4();
        const { data: feedback, error } = await supabase
          .from('feedback')
          .insert({
            id: feedbackId,
            user_id: user.id,
            user_email: user.email || null,
            user_name: user.name || null,
            user_type: user.type || null,
            type: resolvedType,
            urgency: urgency || 'normal',
            subject: subject || null,
            message: feedbackText,
            image_urls: image_urls || [],
            page_url: page_url || 'mcp-client',
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        res.json({ success: true, id: feedback.id, message: 'Feedback submitted' });
        break;
      }

      case 'rate_task': {
        const { task_id, rating_score, comment } = params;
        if (!task_id) {
          return res.status(400).json({ error: 'task_id is required' });
        }
        if (!rating_score || rating_score < 1 || rating_score > 5) {
          return res.status(400).json({ error: 'rating_score must be between 1 and 5' });
        }

        // Get task details
        const { data: rateTask, error: rateTaskError } = await supabase
          .from('tasks')
          .select('*, human_id, agent_id, status, proof_submitted_at')
          .eq('id', task_id)
          .single();

        if (rateTaskError || !rateTask) {
          return res.status(404).json({ error: 'Task not found' });
        }

        // Check if agent is part of this task
        if (user.id !== rateTask.human_id && user.id !== rateTask.agent_id) {
          return res.status(403).json({ error: 'You are not part of this task' });
        }

        // Check if task is finalized
        const isRateTaskFinalized = rateTask.status === 'paid' ||
          (rateTask.status === 'disputed' && rateTask.dispute_resolved_at);

        if (!isRateTaskFinalized) {
          return res.status(400).json({
            error: 'Task must be finalized before rating',
            details: 'You can rate after the task is paid or a dispute is resolved'
          });
        }

        // Determine who is being rated
        const rateRateeId = user.id === rateTask.human_id ? rateTask.agent_id : rateTask.human_id;

        if (!rateRateeId) {
          return res.status(400).json({ error: 'Cannot determine who to rate — task may be incomplete' });
        }
        if (rateRateeId === user.id) {
          return res.status(403).json({ error: 'You cannot rate yourself' });
        }

        // Check if already rated
        const { data: existingMcpRating } = await supabase
          .from('ratings')
          .select('id')
          .eq('task_id', task_id)
          .eq('rater_id', user.id)
          .single();

        if (existingMcpRating) {
          return res.status(400).json({ error: 'You have already rated this task' });
        }

        // Create rating
        const { data: newMcpRating, error: mcpRatingError } = await supabase
          .from('ratings')
          .insert({
            task_id,
            rater_id: user.id,
            ratee_id: rateRateeId,
            rating_score,
            comment: comment || null,
            visible_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (mcpRatingError) {
          console.error('Error creating rating via MCP:', mcpRatingError);
          return res.status(500).json({ error: 'Failed to create rating' });
        }

        // Check if both parties have rated
        const { data: allMcpRatings } = await supabase
          .from('ratings')
          .select('id, visible_at')
          .eq('task_id', task_id);

        const mcpBothRated = allMcpRatings && allMcpRatings.length === 2;
        const mcpIsVisible = mcpBothRated && allMcpRatings[0].visible_at !== null;

        // Update aggregate rating
        await updateUserRating(rateRateeId);

        // Send notification
        const mcpRaterType = user.id === rateTask.human_id ? 'human' : 'agent';
        await createNotification(
          rateRateeId,
          'rating_received',
          mcpBothRated ? 'Ratings Now Visible' : 'Rating Received',
          mcpBothRated
            ? `Both parties have rated task #${task_id.substring(0, 8)}. Ratings are now visible!`
            : `You have received a rating for task #${task_id.substring(0, 8)}. Rate the ${mcpRaterType} to see both ratings.`,
          `/tasks/${task_id}`
        );

        res.json({
          success: true,
          rating: newMcpRating,
          bothRated: mcpBothRated,
          isVisible: mcpIsVisible,
          message: mcpBothRated
            ? 'Both parties have rated. Ratings are now visible!'
            : 'Rating submitted. It will be visible once both parties rate, or after 72 hours.'
        });
        break;
      }

      case 'report_error': {
        const { action: errorAction, error_message, error_code, error_log, task_id: errorTaskId, context: errorContext } = params;
        if (!errorAction || !error_message) {
          return res.status(400).json({ error: 'action and error_message are required' });
        }

        const errorId = uuidv4();
        const metadata = {
          action: errorAction,
          error_code: error_code || null,
          error_log: typeof error_log === 'string' ? error_log.slice(0, 10000) : null,
          task_id: errorTaskId || null,
          context: errorContext || null,
          reported_at: new Date().toISOString()
        };

        const { data: errorReport, error: insertError } = await supabase
          .from('feedback')
          .insert({
            id: errorId,
            user_id: user.id,
            user_email: user.email,
            user_name: user.name,
            user_type: user.type || 'agent',
            type: 'agent_error',
            urgency: 'high',
            subject: `[${errorAction}] ${error_code || 'error'}`,
            message: error_message,
            metadata,
            page_url: errorTaskId ? `/tasks/${errorTaskId}` : 'mcp-client',
            status: 'new',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Notify admins of agent errors
        const { getAdminUserIds } = require('./middleware/adminAuth');
        const adminIds = getAdminUserIds();
        for (const adminId of adminIds) {
          await createNotification(
            adminId,
            'agent_error',
            'Agent Error Report',
            `Agent "${user.name || user.email}" reported an error during "${errorAction}": ${error_message.slice(0, 200)}`,
            `/admin/feedback`
          );
        }

        console.log(`[AgentError] ${user.id} reported error during "${errorAction}": ${error_message.slice(0, 200)}`);
        res.json({ success: true, id: errorReport.id, message: 'Error report submitted. The platform team has been notified.' });
        break;
      }

      // ===== Notifications =====
      case 'notifications': {
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        res.json(notifications || []);
        break;
      }

      case 'mark_notification_read': {
        const { notification_id } = params;
        if (!notification_id) return res.status(400).json({ error: 'notification_id is required' });

        // Try is_read column first, fall back to read_at
        try {
          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification_id)
            .eq('user_id', user.id);
          if (error) throw error;
          res.json({ success: true });
        } catch (e) {
          // Fallback: try read_at column
          try {
            const { error: err2 } = await supabase
              .from('notifications')
              .update({ read_at: new Date().toISOString() })
              .eq('id', notification_id)
              .eq('user_id', user.id);
            if (err2) throw err2;
            res.json({ success: true });
          } catch (e2) {
            // If neither column exists, just acknowledge
            res.json({ success: true, note: 'Notification acknowledged (read tracking unavailable)' });
          }
        }
        break;
      }

      // ===== Direct Hire =====
      case 'direct_hire':
      case 'create_booking': {
        // Hire a specific human directly (from conversation or by human_id)
        const { conversation_id, human_id: directHumanId, title, description, location, scheduled_at, duration_hours, hourly_rate, budget, category, payment_currency } = params;
        if (!title) return res.status(400).json({ error: 'title is required' });

        // Payment method check (currency-aware)
        const { listPaymentMethods: listDirectHirePMs } = require('./backend/services/stripeService');
        if (payment_currency === 'usdc') {
          // USDC task — check USDC available balance covers the task amount
          const directBudget = budget || (hourly_rate && duration_hours ? Math.round(hourly_rate * duration_hours * 100) / 100 : 50);
          const directBudgetCents = Math.round(directBudget * 100);
          const directBalance = await getWalletBalance(supabase, user.id);
          const directTxs = directBalance.transactions || [];
          const directUsdcAvail = directTxs.filter(tx => tx.payout_method === 'usdc' && tx.status === 'available').reduce((s, tx) => s + tx.amount_cents, 0);
          if (directUsdcAvail < directBudgetCents) {
            return res.status(402).json({
              error: 'Insufficient USDC balance',
              code: 'payment_required',
              message: `This task requires ${directBudget} USDC but your available USDC balance is ${(directUsdcAvail / 100).toFixed(2)}. Deposit more USDC to proceed.`,
              actions: [
                { tool: 'setup_payment', params: { method: 'usdc' }, label: 'Deposit USDC' },
                { tool: 'setup_payment', params: { method: 'stripe' }, label: 'Add credit card instead' }
              ]
            });
          }
        } else {
          // Stripe (default) — require at least one card on file
          let directHireCards = [];
          if (user.stripe_customer_id && stripe) {
            try {
              directHireCards = await listDirectHirePMs(user.stripe_customer_id);
            } catch (e) {
              console.error('[MCP/direct_hire] Failed to check payment methods:', e.message);
            }
          }
          if (directHireCards.length === 0 && !user.wallet_address) {
            return res.status(402).json({
              error: 'No payment method on file',
              code: 'payment_required',
              message: 'Use the setup_payment tool to add a credit card or configure USDC.',
              actions: [
                { tool: 'setup_payment', params: { method: 'stripe' }, label: 'Add credit card' },
                { tool: 'setup_payment', params: { method: 'usdc' }, label: 'Set up USDC' }
              ]
            });
          }
        }

        let humanId = directHumanId || null;
        if (!humanId && conversation_id) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('human_id')
            .eq('id', conversation_id)
            .single();
          if (conv) humanId = conv.human_id;
        }

        const budgetAmount = budget || (hourly_rate && duration_hours
          ? Math.round(hourly_rate * duration_hours * 100) / 100
          : 50);

        const taskId = uuidv4();
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            id: taskId,
            agent_id: user.id,
            human_id: humanId,
            title,
            description: description || title,
            category: category || 'other',
            location: location || null,
            budget: budgetAmount,
            escrow_amount: budgetAmount,
            status: humanId ? 'assigned' : 'open',
            escrow_status: humanId ? 'pending_deposit' : 'awaiting_worker',
            task_type: 'direct',
            human_ids: humanId ? [humanId] : [],
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        res.json({
          booking_id: task.id,
          task_id: task.id,
          status: task.status,
          budget: budgetAmount,
          message: humanId ? 'Booking created and human assigned' : 'Booking created'
        });
        break;
      }

      case 'complete_booking': {
        // Agent marks a task for review (backward-compat alias)
        const booking_id = params.booking_id || params.task_id;
        if (!booking_id) return res.status(400).json({ error: 'booking_id or task_id is required' });

        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', booking_id)
          .single();

        if (taskErr || !task) return res.status(404).json({ error: 'Booking not found' });
        if (task.agent_id !== user.id) return res.status(403).json({ error: 'Not your booking' });

        const { error, data: updatedBooking } = await supabase
          .from('tasks')
          .update({ status: 'pending_review', updated_at: new Date().toISOString() })
          .eq('id', booking_id)
          .in('status', ['in_progress', 'assigned'])
          .select('id')
          .single();

        if (error || !updatedBooking) {
          return res.status(409).json({ error: 'Booking cannot be marked for review in its current status' });
        }
        res.json({ success: true, status: 'pending_review', message: 'Booking marked for review' });
        break;
      }

      // ===== List tasks (canonical: my_tasks) =====
      case 'get_tasks':
      case 'my_postings':
      case 'my_adhoc_tasks':
      case 'my_tasks':
      case 'my_bookings': {
        // List all tasks for this agent
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(tasks || []);
        break;
      }

      case 'task_templates': {
        // Return available task categories/templates
        const templates = [
          { category: 'delivery', title: 'Package Delivery', description: 'Pick up and deliver a package', default_budget: 25, budget_min: 20, budget_max: 50, default_duration_hours: 1 },
          { category: 'photography', title: 'Photo/Video Capture', description: 'Take photos or video at a location', default_budget: 50, budget_min: 40, budget_max: 75, default_duration_hours: 1.5 },
          { category: 'data_collection', title: 'Data Collection', description: 'Collect data or information from a physical location', default_budget: 40, budget_min: 30, budget_max: 50, default_duration_hours: 2 },
          { category: 'errands', title: 'Run an Errand', description: 'Complete an errand (shopping, returns, etc.)', default_budget: 30, budget_min: 25, budget_max: 40, default_duration_hours: 1 },
          { category: 'cleaning', title: 'Cleaning', description: 'Clean a space, office, or property', default_budget: 40, budget_min: 40, budget_max: 80, default_duration_hours: 2.5 },
          { category: 'moving', title: 'Moving Help', description: 'Help move furniture, boxes, or belongings', default_budget: 50, budget_min: 50, budget_max: 100, default_duration_hours: 3.5 },
          { category: 'manual_labor', title: 'Manual Labor', description: 'Physical task like assembling, lifting, yard work', default_budget: 45, budget_min: 40, budget_max: 80, default_duration_hours: 3 },
          { category: 'inspection', title: 'Site Inspection', description: 'Visit and inspect a location, report findings', default_budget: 35, budget_min: 30, budget_max: 50, default_duration_hours: 1 },
          { category: 'tech', title: 'Tech Support', description: 'Set up, install, or troubleshoot technology', default_budget: 45, budget_min: 40, budget_max: 75, default_duration_hours: 1.5 },
          { category: 'translation', title: 'Translation', description: 'Translate text or provide interpretation', default_budget: 40, budget_min: 30, budget_max: 60, default_duration_hours: 2 },
          { category: 'verification', title: 'Verification', description: 'Verify information, identity, or conditions on-site', default_budget: 30, budget_min: 25, budget_max: 50, default_duration_hours: 1 },
          { category: 'general', title: 'General Task', description: 'Any other physical-world task', default_budget: 30, budget_min: 20, budget_max: 60, default_duration_hours: 2 }
        ];

        if (params.category) {
          const filtered = templates.filter(t => t.category === params.category);
          return res.json(filtered);
        }
        res.json(templates);
        break;
      }

      // ===== Subscriptions & Billing =====

      case 'subscription_tiers': {
        const { TIERS } = require('./config/tiers');
        const tiers = Object.entries(TIERS).map(([key, config]) => ({
          id: key,
          name: config.name,
          price_monthly: config.price_monthly,
          price_annual: config.price_annual || null,
          worker_fee_percent: config.worker_fee_percent,
          poster_fee_percent: config.poster_fee_percent,
          task_limit_monthly: config.task_limit_monthly === Infinity ? 'unlimited' : config.task_limit_monthly,
          badge: config.badge,
          badge_color: config.badge_color,
          worker_priority: config.worker_priority,
        }));
        res.json({ tiers });
        break;
      }

      case 'subscription_status': {
        const { getUserSubscription } = require('./backend/services/subscriptionService');
        const subscription = await getUserSubscription(supabase, user.id);
        res.json({ subscription });
        break;
      }

      case 'subscription_upgrade': {
        const { createCheckoutSession } = require('./backend/services/subscriptionService');
        const tier = params.tier;
        const billingPeriod = params.billing_period || 'monthly';

        if (!tier || !['builder', 'pro'].includes(tier)) {
          return res.status(400).json({ error: 'tier parameter is required and must be "builder" or "pro"' });
        }
        if (billingPeriod && !['monthly', 'annual'].includes(billingPeriod)) {
          return res.status(400).json({ error: 'billing_period must be "monthly" or "annual"' });
        }

        const { getTierConfig } = require('./config/tiers');
        if (user.subscription_tier === tier) {
          return res.status(400).json({ error: `You are already on the ${getTierConfig(tier).name} plan.` });
        }

        const result = await createCheckoutSession(supabase, user, tier, billingPeriod);
        res.json(result);
        break;
      }

      case 'subscription_portal': {
        const { createBillingPortalSession } = require('./backend/services/subscriptionService');
        if (!user.stripe_customer_id) {
          return res.status(400).json({ error: 'No billing account found. Please subscribe to a plan first.' });
        }
        const portalResult = await createBillingPortalSession(user.stripe_customer_id);
        res.json(portalResult);
        break;
      }

      // ===== Payment setup tools =====
      case 'setup_payment': {
        const { method: payMethod } = params;

        // Gather current payment status
        const { listPaymentMethods: listPMs, getOrCreateStripeCustomer: getOrCreateCust, createCheckoutSetupSession: createCheckoutSetup } = require('./backend/services/stripeService');
        let cardDetails = [];
        if (user.stripe_customer_id) {
          try {
            cardDetails = await listPMs(user.stripe_customer_id);
          } catch (e) {
            console.error('[MCP/setup_payment] Failed to list PMs:', e.message);
          }
        }
        const hasCard = cardDetails.length > 0;
        const hasWallet = !!user.wallet_address;

        // No method specified — return status + all options
        if (!payMethod) {
          return res.json({
            payment_status: {
              stripe: {
                configured: hasCard,
                cards: cardDetails.map(c => ({ brand: c.brand, last4: c.last4, exp: `${c.exp_month}/${c.exp_year}`, is_default: c.is_default }))
              },
              usdc: {
                configured: hasWallet,
                wallet_address: user.wallet_address || null
              }
            },
            options: [
              { method: 'stripe', label: 'Add credit card', description: 'Set up a credit card via Stripe. You will receive a URL to open in a browser.', action: 'Call setup_payment with method="stripe"' },
              { method: 'usdc', label: 'Deposit USDC', description: 'Send USDC on Base network to fund your account.', action: 'Call setup_payment with method="usdc"' }
            ],
            ready_to_hire: hasCard || hasWallet,
            message: hasCard || hasWallet
              ? 'You have a payment method configured and can post tasks and hire humans.'
              : 'No payment method configured. Set one up to post tasks and hire humans.'
          });
        }

        // Stripe card setup via hosted Checkout
        if (payMethod === 'stripe') {
          try {
            const customerId = await getOrCreateCust(supabase, user);
            const { url, session_id } = await createCheckoutSetup(customerId, user.id);

            return res.json({
              method: 'stripe',
              setup_url: url,
              session_id,
              instructions: 'Open this URL in a browser to securely add your credit card. The link expires in 24 hours.',
              existing_cards: cardDetails.map(c => ({ brand: c.brand, last4: c.last4, is_default: c.is_default })),
              note: hasCard
                ? 'You already have a card on file. Opening this URL will let you add another.'
                : 'Once you complete card setup, you can post tasks and hire humans.'
            });
          } catch (e) {
            console.error('[MCP/setup_payment] Stripe setup error:', e.message);
            return res.status(500).json({ error: `Failed to create card setup session: ${e.message}` });
          }
        }

        // USDC deposit instructions
        if (payMethod === 'usdc') {
          const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;
          if (!platformWallet) {
            return res.status(503).json({
              error: 'USDC payments are not yet available on this platform.'
            });
          }

          return res.json({
            method: 'usdc',
            platform_wallet_address: platformWallet,
            network: 'Base (Ethereum L2)',
            token: 'USDC',
            token_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            instructions: [
              `Send USDC on the Base network to: ${platformWallet}`,
              'Only send USDC on Base — other tokens or networks will be lost.',
              'Deposits are credited after on-chain confirmation (typically 1-2 minutes).'
            ],
            your_wallet_address: user.wallet_address || null,
            note: !user.wallet_address
              ? 'You have not set a wallet address for receiving USDC payouts. Use the platform dashboard to set one.'
              : `Your USDC payout address is: ${user.wallet_address}`
          });
        }

        return res.status(400).json({ error: `Invalid method: "${payMethod}". Use "stripe" or "usdc".` });
      }

      case 'account_status': {
        // Gather payment method info
        const { listPaymentMethods: listAcctPMs } = require('./backend/services/stripeService');
        let acctCardDetails = [];
        if (user.stripe_customer_id) {
          try {
            acctCardDetails = await listAcctPMs(user.stripe_customer_id);
          } catch (e) {
            console.error('[MCP/account_status] Failed to list PMs:', e.message);
          }
        }

        const acctHasCard = acctCardDetails.length > 0;
        const acctHasWallet = !!user.wallet_address;

        // Get USDC available balance
        const acctBalance = await getWalletBalance(supabase, user.id);
        const acctTxs = acctBalance.transactions || [];
        const usdcAvailCents = acctTxs.filter(tx => tx.payout_method === 'usdc' && tx.status === 'available').reduce((s, tx) => s + tx.amount_cents, 0);

        // ready_to_hire = has at least one payment rail configured (general signal, not amount-specific)
        const acctReadyToHire = acctHasCard || acctHasWallet;

        // Build setup_needed array
        const setupNeeded = [];
        if (!acctReadyToHire) {
          setupNeeded.push({
            action: 'setup_payment',
            priority: 'required',
            message: 'Add a payment method to post tasks and hire humans.',
            hint: 'Call setup_payment to get started.'
          });
        }

        const acctTier = user.subscription_tier || 'free';
        const acctTierConfig = getTierConfig(acctTier);

        res.json({
          account: {
            id: user.id,
            name: user.name,
            email: user.email,
            type: user.type,
            created_at: user.created_at
          },
          subscription: {
            tier: acctTier,
            tier_name: acctTierConfig.name,
            poster_fee_percent: acctTierConfig.poster_fee_percent,
            task_limit_monthly: acctTierConfig.task_limit_monthly === Infinity ? 'unlimited' : acctTierConfig.task_limit_monthly
          },
          payment_methods: {
            stripe: {
              configured: acctHasCard,
              cards: acctCardDetails.map(c => ({ brand: c.brand, last4: c.last4, exp: `${c.exp_month}/${c.exp_year}`, is_default: c.is_default }))
            },
            usdc: {
              configured: acctHasWallet,
              wallet_address: user.wallet_address || null,
              available_balance_cents: usdcAvailCents,
              available_balance: usdcAvailCents / 100
            }
          },
          ready_to_hire: acctReadyToHire,
          setup_needed: setupNeeded,
          message: setupNeeded.length > 0
            ? `${setupNeeded.length} action(s) needed before you can fully use the platform.`
            : 'Your account is fully set up and ready to go.'
        });
        break;
      }

      default:
        res.status(400).json({ error: `Unknown method: ${method}` });
    }
  } catch (e) {
    console.error('MCP error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ MCP STREAMABLE HTTP (Standard MCP Protocol for IDE Integration) ============
// JSON-RPC 2.0 endpoint for Cursor, Claude Desktop, Windsurf, VS Code, etc.

const MCP_TOOL_DEFINITIONS = [
  { name: 'list_humans', description: 'Search for available humans by category, city, rating, skills, and availability', inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Skill category (delivery, photography, cleaning, etc.)' }, city: { type: 'string', description: 'City to search in' }, state: { type: 'string', description: 'State/province to filter by' }, min_rating: { type: 'number', description: 'Minimum rating (1-5)' }, language: { type: 'string', description: 'Required language' }, availability: { type: 'string', description: 'Filter by availability status (available, busy, offline). Defaults to available' }, limit: { type: 'number', description: 'Max results to return (default 100)' } } } },
  { name: 'get_human', description: 'Get detailed profile of a specific human by their ID', inputSchema: { type: 'object', properties: { human_id: { type: 'string', description: 'The human user ID' } }, required: ['human_id'] } },
  { name: 'create_posting', description: 'Create a new task posting for humans to apply to', inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Task category (delivery, photography, cleaning, etc.)' }, title: { type: 'string', description: 'Task title' }, description: { type: 'string', description: 'Detailed task description' }, location: { type: 'string', description: 'Task location (address or area)' }, city: { type: 'string', description: 'City where task is located' }, urgency: { type: 'string', description: 'Urgency level: low, medium, high, urgent' }, budget: { type: 'number', description: 'Budget in USD' }, budget_min: { type: 'number', description: 'Min budget in USD' }, budget_max: { type: 'number', description: 'Max budget in USD' }, deadline: { type: 'string', description: 'Task deadline (ISO 8601)' } }, required: ['title', 'description'] } },
  { name: 'direct_hire', description: 'Directly hire a specific human for a task (creates task and assigns immediately)', inputSchema: { type: 'object', properties: { human_id: { type: 'string', description: 'Human to hire (or provide conversation_id)' }, conversation_id: { type: 'string', description: 'Conversation ID to look up the human from' }, title: { type: 'string', description: 'Task title' }, description: { type: 'string', description: 'Task description' }, location: { type: 'string', description: 'Task location' }, scheduled_at: { type: 'string', description: 'When the task should happen (ISO 8601)' }, duration_hours: { type: 'number', description: 'Expected duration in hours' }, hourly_rate: { type: 'number', description: 'Hourly rate in USD' }, budget: { type: 'number', description: 'Fixed budget in USD (overrides hourly rate)' } }, required: ['title', 'description'] } },
  { name: 'hire_human', description: 'Send a hire offer to a human for an existing task', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID to hire for' }, human_id: { type: 'string', description: 'Human to hire' }, deadline_hours: { type: 'number', description: 'Hours until offer expires (default 24)' }, instructions: { type: 'string', description: 'Additional instructions for the human' } }, required: ['task_id', 'human_id'] } },
  { name: 'my_tasks', description: 'List all your posted tasks', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_task_status', description: 'Get the current status of a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' } }, required: ['task_id'] } },
  { name: 'get_task_details', description: 'Get full details of a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' } }, required: ['task_id'] } },
  { name: 'get_applicants', description: 'Get humans who applied to your task', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' } }, required: ['task_id'] } },
  { name: 'assign_human', description: 'Assign a specific human to your task from the applicants', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' }, human_id: { type: 'string', description: 'Human ID to assign' } }, required: ['task_id', 'human_id'] } },
  { name: 'approve_task', description: 'Approve completed work and release payment to the human', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID to approve' } }, required: ['task_id'] } },
  { name: 'view_proof', description: 'View proof of completion submitted by the human', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' } }, required: ['task_id'] } },
  { name: 'dispute_task', description: 'File a dispute for a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: 'Task ID' }, reason: { type: 'string', description: 'Reason for dispute' }, category: { type: 'string', description: 'Dispute category' }, evidence_urls: { type: 'array', items: { type: 'string' }, description: 'URLs to supporting evidence' } }, required: ['task_id', 'reason'] } },
  { name: 'start_conversation', description: 'Start a conversation with a human', inputSchema: { type: 'object', properties: { human_id: { type: 'string', description: 'Human to message' }, message: { type: 'string', description: 'Initial message' } }, required: ['human_id'] } },
  { name: 'send_message', description: 'Send a message in an existing conversation', inputSchema: { type: 'object', properties: { conversation_id: { type: 'string', description: 'Conversation ID' }, content: { type: 'string', description: 'Message content' }, type: { type: 'string', description: 'Message type (text, system)' } }, required: ['conversation_id', 'content'] } },
  { name: 'get_messages', description: 'Get messages in a conversation', inputSchema: { type: 'object', properties: { conversation_id: { type: 'string', description: 'Conversation ID' }, since: { type: 'string', description: 'Only messages after this ISO 8601 timestamp' } }, required: ['conversation_id'] } },
  { name: 'get_unread_summary', description: 'Get unread message count across all conversations', inputSchema: { type: 'object', properties: {} } },
  { name: 'set_webhook', description: 'Register a webhook URL for push notifications', inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'Webhook URL' }, secret: { type: 'string', description: 'Webhook signing secret' } }, required: ['url'] } },
  { name: 'task_templates', description: 'Browse available task templates by category', inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Category to filter by' } } } },
  { name: 'notifications', description: 'Get your notifications', inputSchema: { type: 'object', properties: {} } },
  { name: 'mark_notification_read', description: 'Mark a notification as read', inputSchema: { type: 'object', properties: { notification_id: { type: 'string', description: 'Notification ID' } }, required: ['notification_id'] } },
  { name: 'submit_feedback', description: 'Submit feedback or bug reports about the platform', inputSchema: { type: 'object', properties: { message: { type: 'string', description: 'Feedback message' }, type: { type: 'string', description: 'Feedback type' }, urgency: { type: 'string', description: 'Urgency level' }, subject: { type: 'string', description: 'Subject line' } }, required: ['message'] } },
  { name: 'setup_payment', description: 'Set up a payment method for your account. Returns a URL to add a credit card via Stripe, or USDC deposit instructions. Call with no arguments to see current payment status and all options.', inputSchema: { type: 'object', properties: { method: { type: 'string', enum: ['stripe', 'usdc'], description: 'Payment method to set up: "stripe" for credit card, "usdc" for crypto deposit. Omit to see current status and all options.' } } } },
  { name: 'account_status', description: 'Get your account status including payment methods, subscription tier, and any setup actions needed before you can post tasks or hire humans.', inputSchema: { type: 'object', properties: {} } },
];

app.post('/api/mcp/sse', async (req, res) => {
  if (!supabase) return res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Database not configured' } });

  const { jsonrpc, id, method, params } = req.body;

  // Handle JSON-RPC 2.0 notifications (no id, no response expected)
  if (method === 'notifications/initialized') {
    return res.status(200).json({ jsonrpc: '2.0' });
  }

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request — expected JSON-RPC 2.0' } });
  }

  switch (method) {
    case 'initialize':
      return res.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'irlwork', version: '1.0.0' }
        }
      });

    case 'tools/list':
      return res.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOL_DEFINITIONS } });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name in params.name' } });
      }

      try {
        // Forward to the existing /api/mcp handler via internal HTTP call
        const authHeader = req.headers.authorization || req.headers['x-api-key'] || '';
        const internalRes = await fetch(`http://localhost:${PORT}/api/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ method: toolName, params: toolArgs })
        });

        const data = await internalRes.json();

        if (internalRes.ok) {
          return res.json({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
          });
        } else {
          return res.json({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: true }
          });
        }
      } catch (e) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: 'Internal server error' } });
      }
    }

    case 'ping':
      return res.json({ jsonrpc: '2.0', id, result: {} });

    default:
      return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});

// ============ NOTIFICATIONS ============
// Notification routes moved to api/routes/notifications.js (mounted at /api/notifications above)

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

    if (error) return res.status(500).json({ error: safeErrorMessage(error) });

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
      human:users!human_id(id, name, type, rating, avatar_url, last_active_at),
      agent:users!agent_id(id, name, type, avatar_url, last_active_at)
    `)
    .or(`human_id.eq.${user.id},agent_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  if (!conversations || conversations.length === 0) {
    return res.json([]);
  }

  // Compute per-conversation unread counts using a single aggregation query
  const convIds = conversations.map(c => c.id);
  const { data: unreadData } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convIds)
    .neq('sender_id', user.id)
    .is('read_at', null);

  const unreadMap = {};
  (unreadData || []).forEach(m => {
    unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
  });

  const result = conversations.map(c => ({
    ...c,
    unread: unreadMap[c.id] || 0
  }));

  res.json(result);
});

app.post('/api/conversations', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { agent_id, task_id } = req.body;

  // Use upsert to prevent race condition duplicates
  // NOTE: Do NOT pass `id` field - let DB generate UUID on insert.
  // On conflict, upsert updates the existing row and RETURNING gives back
  // the existing row's ID (not a phantom generated one).
  const { data: conversation, error } = await supabase
    .from('conversations')
    .upsert({
      human_id: user.id,
      agent_id: agent_id || null,
      task_id: task_id || null
    }, {
      onConflict: 'human_id,agent_id,task_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

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
      task:tasks(id, title, category, budget, status, location, is_remote),
      human:users!human_id(id, name, type, rating, avatar_url),
      agent:users!agent_id(id, name, type, avatar_url)
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

// Get unread message count
// NOTE: This route MUST be defined before /api/messages/:conversation_id
// to avoid Express matching "unread" as a conversation_id parameter.
app.get('/api/messages/unread/count', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Count unread messages where user is not the sender
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`human_id.eq.${user.id},agent_id.eq.${user.id}`);

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

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  res.json({ count: unreadMessages?.length || 0 });
});

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

      if (error) return res.status(500).json({ error: safeErrorMessage(error) });
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
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  res.json(messages || []);
});

app.post('/api/messages', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { conversation_id, content, attachments } = req.body;

  // Validate message content
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Message content is too long (max 10,000 characters)' });
  }

  // Validate attachments if provided
  let validatedAttachments = [];
  if (attachments && Array.isArray(attachments)) {
    if (attachments.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 attachments per message' });
    }
    for (const att of attachments) {
      if (!att.url || !att.filename) {
        return res.status(400).json({ error: 'Each attachment must have url and filename' });
      }
      validatedAttachments.push({
        url: att.url,
        filename: att.filename,
        type: att.type || 'file',
        size: att.size || 0
      });
    }
  }

  // Per-conversation rate limit check
  if (conversation_id) {
    const rateCheck = checkMessageRateLimit(user.id, conversation_id);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Message rate limit exceeded. Please slow down.',
        retry_after_seconds: rateCheck.retryAfterSeconds
      });
    }
  }

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

  // Check if conversation is locked (task in terminal status)
  if (conversation.task_id) {
    const { data: taskStatus } = await supabase
      .from('tasks').select('status').eq('id', conversation.task_id).single();
    if (taskStatus && ['paid', 'cancelled', 'expired'].includes(taskStatus.status)) {
      return res.status(409).json({ error: 'conversation_closed', message: 'This task is closed. Messages cannot be sent.' });
    }
  }

  const id = uuidv4();
  const messageInsert = {
    id,
    conversation_id,
    sender_id: user.id,
    content: content || '',
    created_at: new Date().toISOString()
  };
  if (validatedAttachments.length > 0) {
    messageInsert.attachments = validatedAttachments;
  }
  const { data: message, error } = await supabase
    .from('messages')
    .insert(messageInsert)
    .select()
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Update conversation's updated_at and last_message preview
  const preview = (content || '').length > 100 ? content.substring(0, 100) + '...' : (content || '');
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString(), last_message: preview })
    .eq('id', conversation_id);

  // Notify the OTHER party about the new message
  const otherPartyId = (user.id === conversation.human_id)
    ? conversation.agent_id
    : conversation.human_id;

  if (otherPartyId) {
    const taskTitle = conversation.tasks?.title || 'a task';
    await createNotification(
      otherPartyId,
      'new_message',
      'New message',
      `New message about "${taskTitle}": ${preview}`,
      `/tasks/${conversation.task_id}?conversation=${conversation_id}`
    );

    // Email notification is now handled by createNotification → notificationService.notify() pipeline

    // Dispatch webhook if the other party has one configured
    dispatchWebhook(otherPartyId, {
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
    }).catch(() => {});
  }

  res.json(message);
});

app.put('/api/messages/:id/read', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Verify user is a participant in the message's conversation before marking read
  const { data: msg } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id')
    .eq('id', req.params.id)
    .single();

  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const { data: conv } = await supabase
    .from('conversations')
    .select('human_id, agent_id')
    .eq('id', msg.conversation_id)
    .single();

  if (!conv || (conv.human_id !== user.id && conv.agent_id !== user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Mark message as read - only messages from OTHER senders can be marked read
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .neq('sender_id', user.id);

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
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
    .select('id, human_id, agent_id, task_id')
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

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Also clear new_message notifications for this conversation's task
  if (conversation.task_id) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('type', 'new_message')
      .eq('is_read', false)
      .like('link', `%${conversation.task_id}%`);
  }

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

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
  res.json(data);
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
  
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
  res.json(tasks || []);
});

// Helper: enrich tasks with applicant_count and agent_name
async function enrichTasksForListing(tasks) {
  if (!tasks || tasks.length === 0) return tasks;
  const taskIds = tasks.map(t => t.id);

  // Get applicant counts
  const { data: appCounts } = await supabase
    .from('task_applications')
    .select('task_id')
    .in('task_id', taskIds);

  const countMap = {};
  if (appCounts) {
    appCounts.forEach(a => {
      countMap[a.task_id] = (countMap[a.task_id] || 0) + 1;
    });
  }

  // Get agent names for non-anonymous tasks
  const agentIds = [...new Set(tasks.filter(t => t.agent_id && !t.is_anonymous).map(t => t.agent_id))];
  const agentMap = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from('users')
      .select('id, name')
      .in('id', agentIds);
    if (agents) agents.forEach(a => { agentMap[a.id] = a.name; });
  }

  return tasks.map(t => ({
    ...t,
    applicant_count: countMap[t.id] || 0,
    agent_name: t.is_anonymous ? 'Anon AI Agent' : (agentMap[t.agent_id] || null),
  }));
}

app.get('/api/tasks/available', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const {
    category,
    city,
    urgency,
    limit = 16,
    offset = 0,
    user_lat,
    user_lng,
    radius,
    radius_km,
    search,
    sort = 'distance',
    include_remote = 'true',
    skills
  } = req.query;

  const includeRemote = include_remote !== 'false';
  // Parse skills filter: comma-separated list of skills to match against required_skills
  const skillsFilter = skills ? skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  function filterBySkills(tasks) {
    if (skillsFilter.length === 0) return tasks;
    return tasks.filter(t => {
      const reqSkills = Array.isArray(t.required_skills) ? t.required_skills : [];
      if (reqSkills.length === 0) return true; // Tasks with no required skills match everyone
      return reqSkills.some(rs => skillsFilter.includes(rs.toLowerCase()));
    });
  }

  // Helper: fetch remote tasks matching current filters
  async function fetchRemoteTasks(existingIds) {
    if (!includeRemote) return [];
    let remoteQuery = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .eq('is_remote', true);
    if (category) remoteQuery = remoteQuery.eq('category', category);
    if (search) {
      // Strip PostgREST filter operators, then escape LIKE wildcards
      const sanitizedSearch = escapeLike(search.replace(/[,.()"']/g, '').trim());
      if (sanitizedSearch) {
        remoteQuery = remoteQuery.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
    }
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
        result_limit: 500,
        result_offset: 0
      });

      if (error) {
        console.error('RPC error:', error);
        // Fall through to legacy filtering if RPC fails
      } else {
        let results = data || [];

        // Merge in remote tasks (visible to all users regardless of location)
        const existingIds = new Set(results.map(r => r.id));
        const remoteTasks = await fetchRemoteTasks(existingIds);
        results = results.concat(remoteTasks);
        results = filterBySkills(results);

        const total = results.length;
        const parsedLimit = parseInt(limit) || 16;
        const parsedOffset = parseInt(offset) || 0;
        const paginatedResults = results.slice(parsedOffset, parsedOffset + parsedLimit);

        // Enrich with applicant counts and agent names
        const enriched = await enrichTasksForListing(paginatedResults);

        return res.json({
          tasks: enriched,
          total,
          hasMore: parsedOffset + parsedLimit < total
        });
      }
    }

    // Fallback: no location or RPC failed - use legacy filtering
    const willDistanceFilter = user_lat && user_lng && radius_km !== 'anywhere' && (radius_km || radius);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        agent:users!tasks_agent_id_fkey(id, name)
      `)
      .eq('status', 'open');

    // When distance filtering, exclude remote tasks from the initial query so they
    // don't consume the limit — remote tasks are fetched separately via fetchRemoteTasks()
    if (willDistanceFilter) {
      query = query.or('is_remote.is.null,is_remote.eq.false');
    }

    if (category) query = query.eq('category', category);
    if (urgency) query = query.eq('urgency', urgency);
    if (search) {
      // Strip PostgREST filter operators, then escape LIKE wildcards
      const sanitizedSearch = escapeLike(search.replace(/[,.()"']/g, '').trim());
      if (sanitizedSearch) {
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

    query = query.limit(500);

    const { data: tasks, error } = await query;

    if (error) return res.status(500).json({ error: safeErrorMessage(error) });

    let results = tasks || [];

    // Apply distance filtering if coordinates provided (legacy fallback)
    // Skip all location filtering when radius_km is 'anywhere' — return all tasks
    if (radius_km === 'anywhere') {
      // "Anywhere" means no location filtering — but still respect remote toggle
      if (!includeRemote) {
        results = results.filter(t => !t.is_remote);
      }
    } else if (willDistanceFilter) {
      const userLatitude = parseFloat(user_lat);
      const userLongitude = parseFloat(user_lng);

      if (isNaN(userLatitude) || isNaN(userLongitude)) {
        // Invalid coordinates — skip distance filtering
      } else if (radius_km) {
        const radiusKm = parseFloat(radius_km) || 50;
        if (radiusKm === 0) {
          results = filterByDistanceKm(results, userLatitude, userLongitude, 5);
        } else {
          results = filterByDistanceKm(results, userLatitude, userLongitude, radiusKm);
        }
      } else if (radius) {
        const maxRadius = parseFloat(radius);
        results = filterByDistance(results, userLatitude, userLongitude, maxRadius);
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

    // Merge in remote tasks for fallback path (mirrors RPC path)
    if (includeRemote) {
      const existingIds = new Set(results.map(r => r.id));
      const remoteTasks = await fetchRemoteTasks(existingIds);
      results = results.concat(remoteTasks);
    }
    results = filterBySkills(results);

    const total = results.length;
    const parsedLimit = parseInt(limit) || 16;
    const parsedOffset = parseInt(offset) || 0;
    const paginatedResults = results.slice(parsedOffset, parsedOffset + parsedLimit);

    // Enrich with applicant counts and agent names
    const enriched = await enrichTasksForListing(paginatedResults);

    res.json({ tasks: enriched, total, hasMore: parsedOffset + parsedLimit < total });
  } catch (err) {
    console.error('Error fetching available tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ============ HUMANS DIRECTORY ============
app.get('/api/humans/directory', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const { category, city, country, country_code, skill, name, min_rate, max_rate, limit = 16, offset = 0, sort = 'rating' } = req.query;

  // Check if user is authenticated
  const authUser = await getUserByToken(req.headers.authorization);

  // Public (unauthenticated) requests are capped at 500 humans
  const PUBLIC_LIMIT = 500;
  let parsedLimit;
  if (authUser) {
    parsedLimit = Math.min(parseInt(limit) || 16, 1000);
  } else {
    parsedLimit = Math.min(parseInt(limit) || 16, PUBLIC_LIMIT);
  }
  const parsedOffset = parseInt(offset) || 0;

  // First get total count with same filters
  let countQuery = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'human');

  // escapeLike() defined at top of file — escapes LIKE wildcards (% and _)
  if (category) countQuery = countQuery.like('skills', `%${escapeLike(category)}%`);
  if (skill) countQuery = countQuery.like('skills', `%${escapeLike(skill)}%`);
  if (city) countQuery = countQuery.ilike('city', `%${escapeLike(city)}%`);
  if (country_code) countQuery = countQuery.ilike('country_code', escapeLike(country_code));
  else if (country) countQuery = countQuery.ilike('country', `%${escapeLike(country)}%`);
  if (name) countQuery = countQuery.ilike('name', `%${escapeLike(name)}%`);
  if (min_rate) countQuery = countQuery.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) countQuery = countQuery.lte('hourly_rate', parseFloat(max_rate));

  const { count: totalCount } = await countQuery;

  // Build data query with sorting
  let query = supabase
    .from('users')
    .select('id, name, city, state, country, country_code, hourly_rate, bio, skills, rating, jobs_completed, verified, availability, created_at, updated_at, total_ratings_count, social_links, headline, languages, timezone, travel_radius, avatar_url, subscription_tier')
    .eq('type', 'human');

  // Sorting
  switch (sort) {
    case 'price_low':
      query = query.order('hourly_rate', { ascending: true, nullsFirst: false });
      break;
    case 'price_high':
      query = query.order('hourly_rate', { ascending: false, nullsFirst: false });
      break;
    case 'most_reviewed':
      query = query.order('total_ratings_count', { ascending: false, nullsFirst: false });
      break;
    case 'most_completed':
      query = query.order('jobs_completed', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'rating':
    default:
      query = query.order('rating', { ascending: false, nullsFirst: false });
      break;
  }

  // Pagination
  query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

  if (category) query = query.like('skills', `%${escapeLike(category)}%`);
  if (skill) query = query.like('skills', `%${escapeLike(skill)}%`);
  if (city) query = query.ilike('city', `%${escapeLike(city)}%`);
  if (country_code) query = query.ilike('country_code', escapeLike(country_code));
  else if (country) query = query.ilike('country', `%${escapeLike(country)}%`);
  if (name) query = query.ilike('name', `%${escapeLike(name)}%`);
  if (min_rate) query = query.gte('hourly_rate', parseFloat(min_rate));
  if (max_rate) query = query.lte('hourly_rate', parseFloat(max_rate));

  const { data: humans, error } = await query;

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  let parsed = humans?.map(h => ({
    ...h,
    skills: safeParseJsonArray(h.skills),
    languages: safeParseJsonArray(h.languages)
  })) || [];

  // Sort: available first, then tier-based priority (Pro > Builder > Free) as a secondary sort
  if (sort === 'rating' || !sort) {
    parsed.sort((a, b) => {
      const aAvail = a.availability === 'available' ? 1 : 0;
      const bAvail = b.availability === 'available' ? 1 : 0;
      if (bAvail !== aAvail) return bAvail - aAvail;
      const aPriority = getTierConfig(a.subscription_tier || 'free').worker_priority;
      const bPriority = getTierConfig(b.subscription_tier || 'free').worker_priority;
      if (bPriority !== aPriority) return bPriority - aPriority;
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  res.json({
    humans: parsed,
    total: totalCount || 0,
    limit: parsedLimit,
    offset: parsedOffset,
    hasMore: parsedOffset + parsedLimit < (totalCount || 0)
  });
});

app.get('/api/humans/:id/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  let { data: user, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
    .eq('id', req.params.id)
    .eq('type', 'human')
    .single();

  if (error || !user) {
    console.error('Human profile fetch error:', error?.message || 'User not found', 'id:', req.params.id);
    return res.status(404).json({ error: 'Human not found' });
  }

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
  const completionRate = (user.total_tasks_accepted || 0) > 0
    ? (((user.total_tasks_completed || 0) / user.total_tasks_accepted) * 100).toFixed(1)
    : null;

  const paymentRate = (user.total_tasks_completed || 0) > 0
    ? ((((user.total_tasks_completed || 0) - (user.total_disputes_filed || 0)) / user.total_tasks_completed) * 100).toFixed(1)
    : null;

  // Strip sensitive fields from public profile
  const { email, password_hash, stripe_customer_id, stripe_account_id, webhook_secret, ...publicUser } = user;

  res.json({
    ...publicUser,
    skills: safeParseJsonArray(user.skills),
    languages: safeParseJsonArray(user.languages),
    reviews: reviews || [],
    total_ratings_count: (reviews || []).length,
    // Derived metrics
    completion_rate: completionRate,
    payment_rate: paymentRate
  });
});

// ============ TASK CREATION (Agents and Humans) ============
app.post('/api/tasks/create', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, description, instructions, instructions_attachments, category, location, budget, latitude, longitude, country, country_code, duration_hours, deadline, requirements, required_skills, is_anonymous, task_type, quantity, assign_to, task_type_id, location_zone, private_address, private_notes, private_contact, budget_usd, datetime_start, skills_required: skillsRequiredInput } = req.body;

  // Verify agent has payment method before allowing task creation
  if (user.type === 'agent') {
    try {
      const { verifyAgentHasPaymentMethod } = require('./backend/services/stripeService');
      const pmCheck = await verifyAgentHasPaymentMethod(supabase, user.id);
      if (!pmCheck.valid) {
        return res.status(402).json({
          error: 'card_required',
          code: 'card_required',
          message: 'Add a payment method before creating tasks.'
        });
      }
    } catch (pmErr) {
      console.error(`[CreateTask] PM verification failed:`, pmErr.message);
      // Don't block task creation if Stripe check fails
    }
  }

  // Run validation pipeline if task_type_id is provided
  const { proceed: createProceed, flagged: taskFlagged, errorResponse: createErrorResponse } = await runTaskValidation(supabase, req.body, user.id);
  if (!createProceed) return res.status(422).json(createErrorResponse);

  const id = uuidv4();
  const budgetAmount = parseFloat(budget || budget_usd) || 50;
  const taskType = task_type === 'open' ? 'open' : 'direct';
  const taskQuantity = taskType === 'open' ? Math.max(1, parseInt(quantity) || 1) : 1;
  const skillsArray = Array.isArray(required_skills || skillsRequiredInput) ? (required_skills || skillsRequiredInput) : [];

  // Duration is required
  if (!duration_hours || isNaN(parseFloat(duration_hours)) || parseFloat(duration_hours) <= 0) {
    return res.status(400).json({ error: 'duration_hours is required and must be a positive number' });
  }
  if (parseFloat(duration_hours) > 720) {
    return res.status(400).json({ error: 'duration_hours cannot exceed 720 (30 days)' });
  }

  // Non-remote tasks must have coordinates for location-based filtering
  const isRemote = !!req.body.is_remote;
  if (!isRemote && (latitude == null || longitude == null)) {
    return res.status(400).json({ error: 'Non-remote tasks must include latitude and longitude' });
  }

  // Encrypt private fields
  let encAddr = null, encNotes = null, encContact = null;
  try {
    if (private_address) encAddr = encryptField(private_address);
    if (private_notes) encNotes = encryptField(private_notes);
    if (private_contact) encContact = encryptField(private_contact);
  } catch (encErr) {
    console.error('[Tasks/Create] Encryption error:', encErr.message);
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(buildTaskInsertData({
      id,
      agent_id: user.id,
      title,
      description,
      instructions: instructions || null,
      instructions_attachments: Array.isArray(instructions_attachments) ? instructions_attachments : [],
      category: category || (task_type_id ? task_type_id : 'general'),
      location: location || location_zone || null,
      latitude: latitude != null ? parseFloat(parseFloat(latitude).toFixed(3)) : null,
      longitude: longitude != null ? parseFloat(parseFloat(longitude).toFixed(3)) : null,
      country: country || null,
      country_code: country_code || null,
      budget: budgetAmount,
      status: taskFlagged ? 'pending_review' : 'open',
      task_type: taskType,
      quantity: taskQuantity,
      human_ids: [],
      escrow_amount: budgetAmount,
      is_remote: isRemote,
      deadline: deadline || datetime_start || null,
      duration_hours: parseFloat(duration_hours),
      requirements: requirements || null,
      required_skills: skillsArray,
      task_type_id: task_type_id || null,
      location_zone: location_zone || null,
      private_address: encAddr,
      private_notes: encNotes,
      private_contact: encContact,
      created_at: new Date().toISOString()
    }, {
      is_anonymous: !!is_anonymous,
      duration_hours: parseFloat(duration_hours),
    }))
    .select()
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Increment total_tasks_posted for agent
  if (user.type === 'agent') {
    await supabase.rpc('increment_user_stat', {
      user_id_param: user.id, stat_name: 'total_tasks_posted', increment_by: 1
    });
  }

  // If assign_to is provided (direct hire flow), assign the human immediately
  if (assign_to && task) {
    const humanId = assign_to;

    // Verify the human exists
    const { data: humanUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', humanId)
      .single();

    if (!humanUser) {
      return res.json(stripPrivateFields({ ...task, message: 'Task posted successfully, but could not find the specified human to assign.' }));
    }

    // Check if creator has a payment method
    let hasPaymentMethod = false;
    if (user.stripe_customer_id && stripe) {
      try {
        const methods = await listPaymentMethods(user.stripe_customer_id);
        hasPaymentMethod = methods.length > 0;
      } catch (e) {
        console.error('[DirectHire] Failed to list Stripe payment methods:', e.message);
      }
    }

    if (hasPaymentMethod) {
      // Stripe path: pending_acceptance with 24-hour review window
      const reviewDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('tasks')
        .update(cleanTaskData({
          human_id: humanId,
          human_ids: [humanId],
          spots_filled: 1,
          status: 'pending_acceptance',
          escrow_status: 'unfunded',
          escrow_amount: budgetAmount,
          payment_method: 'stripe',
          review_deadline: reviewDeadline,
          updated_at: new Date().toISOString()
        }))
        .eq('id', id);

      await createNotification(
        humanId,
        'task_offered',
        'New Task Offer!',
        `You've been offered "${title}" ($${budgetAmount}). You have 24 hours to accept or decline.`,
        `/tasks/${id}`
      );

      return res.json(stripPrivateFields({
        ...task,
        status: 'pending_acceptance',
        human_id: humanId,
        human_ids: [humanId],
        review_deadline: reviewDeadline,
        message: `Task created and offer sent to ${humanUser.name}. They have 24 hours to accept.`
      }));
    } else {
      // No payment method: set to pending_acceptance anyway, user can add payment later
      await supabase
        .from('tasks')
        .update(cleanTaskData({
          human_id: humanId,
          human_ids: [humanId],
          spots_filled: 1,
          status: 'pending_acceptance',
          escrow_status: 'unfunded',
          escrow_amount: budgetAmount,
          updated_at: new Date().toISOString()
        }))
        .eq('id', id);

      await createNotification(
        humanId,
        'task_offered',
        'New Task Offer!',
        `You've been offered "${title}" ($${budgetAmount}). You have 24 hours to accept or decline.`,
        `/tasks/${id}`
      );

      return res.json(stripPrivateFields({
        ...task,
        status: 'pending_acceptance',
        human_id: humanId,
        human_ids: [humanId],
        message: `Task created and offer sent to ${humanUser.name}.`
      }));
    }
  }

  // Default response (no assign_to)
  const response = stripPrivateFields(task);
  response.message = 'Task posted successfully.';
  if (encAddr || encNotes || encContact) {
    response.private_fields_stored = [];
    if (encAddr) response.private_fields_stored.push('private_address');
    if (encNotes) response.private_fields_stored.push('private_notes');
    if (encContact) response.private_fields_stored.push('private_contact');
    response.note = 'Private fields will be released to the assigned worker upon task acceptance';
  }

  res.json(response);
});

// ============ USER PROFILE ============
app.get('/api/profile', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // Get full profile data
  const { data: profile, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
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
    avatar_url: profile.avatar_url || '',
    hourly_rate: profile.hourly_rate,
    skills: safeParseJsonArray(profile.skills),
    languages: safeParseJsonArray(profile.languages),
    travel_radius: profile.travel_radius || 25,
    social_links: profile.social_links || {},
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
    total_paid: parseFloat(profile.total_paid) || 0,
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
  
  const { name, bio, city, state, hourly_rate, skills, availability, avatar_url, languages, travel_radius, social_links } = req.body;

  const updates = { updated_at: new Date().toISOString(), verified: true };

  if (name) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (city) updates.city = city;
  if (state) updates.state = state;
  if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate;
  if (availability) updates.availability = availability;
  if (skills) updates.skills = JSON.stringify(skills);
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (languages !== undefined) updates.languages = JSON.stringify(Array.isArray(languages) ? languages : []);
  if (travel_radius !== undefined) {
    updates.travel_radius = travel_radius;
    updates.service_radius = travel_radius;
  }
  if (social_links !== undefined) {
    // Sanitize social_links — only allow known platforms with string values
    const allowedPlatforms = ['twitter', 'instagram', 'linkedin', 'github', 'tiktok', 'youtube'];
    const cleaned = {};
    if (typeof social_links === 'object' && social_links !== null) {
      for (const [key, value] of Object.entries(social_links)) {
        if (!allowedPlatforms.includes(key) || typeof value !== 'string' || !value.trim()) continue;
        let v = value.trim();
        // Normalize URLs without protocol
        if (/^(www\.)?(x|twitter|instagram|linkedin|github|tiktok|youtube|youtu)\.(com|be)\//i.test(v)) {
          v = 'https://' + v;
        }
        if (/^https?:\/\//i.test(v)) {
          try {
            const url = new URL(v);
            const parts = url.pathname.split('/').filter(Boolean);
            if (key === 'linkedin' && parts[0] === 'in' && parts[1]) {
              v = parts[1].replace(/^@/, '');
            } else if (key === 'youtube' && (parts[0] === 'c' || parts[0] === 'channel') && parts[1]) {
              v = parts[1];
            } else if (parts.length > 0) {
              v = parts[0].replace(/^@/, '');
            }
          } catch {
            v = v.replace(/^https?:\/\/(www\.)?(twitter|x|instagram|linkedin|github|tiktok|youtube)\.com\/(in\/)?(@)?/i, '');
          }
        }
        v = v.replace(/^@/, '');
        if (v) cleaned[key] = v;
      }
    }
    updates.social_links = cleaned;
  }


  const { data: profile, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select(USER_SELECT_COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });

  // Parse JSONB fields before returning
  res.json({ success: true, profile: {
    ...profile,
    skills: safeParseJsonArray(profile.skills),
    languages: safeParseJsonArray(profile.languages)
  }});
});

// ============ WALLET BALANCE & WITHDRAWALS ============

app.get('/api/wallet/balance', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const balance = await getWalletBalance(supabase, user.id);

    // Calculate per-rail breakdowns
    const txs = balance.transactions || [];
    const stripeAvailableCents = txs.filter(tx => tx.payout_method !== 'usdc' && tx.status === 'available').reduce((s, tx) => s + tx.amount_cents, 0);
    const usdcAvailableCents = txs.filter(tx => tx.payout_method === 'usdc' && tx.status === 'available').reduce((s, tx) => s + tx.amount_cents, 0);

    res.json({
      user_id: user.id,
      wallet_address: user.wallet_address || null,
      has_wallet: !!user.wallet_address,
      has_bank: !!user.stripe_account_id && !!user.stripe_onboarding_complete,
      stripe_available_cents: stripeAvailableCents,
      usdc_available_cents: usdcAvailableCents,
      ...balance
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

app.post('/api/wallet/withdraw', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount_cents, method } = req.body;

  if (method === 'usdc') {
    // USDC withdrawal path
    if (!user.wallet_address) {
      return res.status(400).json({
        error: 'No wallet address set',
        action: 'connect_wallet',
        message: 'Set up your wallet address to withdraw USDC.'
      });
    }
    try {
      const { processUsdcWithdrawal } = require('./backend/services/usdcWithdrawalService');
      const result = await processUsdcWithdrawal(supabase, user.id, amount_cents || null, createNotification);
      return res.json(result);
    } catch (error) {
      console.error('[USDC Withdraw] Error:', error.message);
      return res.status(400).json({ error: safeErrorMessage(error) });
    }
  }

  // Stripe withdrawal path (default)
  if (!user.stripe_account_id) {
    return res.status(400).json({
      error: 'No bank account connected',
      action: 'connect_stripe',
      message: 'Connect your bank account to withdraw funds.'
    });
  }

  try {
    const { processStripeWithdrawal } = require('./backend/services/withdrawalService');
    const result = await processStripeWithdrawal(supabase, user.id, amount_cents || null, createNotification);
    return res.json(result);
  } catch (error) {
    console.error('[Withdraw] Error:', error.message);
    return res.status(400).json({ error: safeErrorMessage(error) });
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
    res.status(500).json({ error: safeErrorMessage(error) });
  }
});

app.get('/api/wallet/status', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const balance = await getWalletBalance(supabase, user.id);

    res.json({
      currency: 'USD',

      // Platform-tracked balances
      pending: balance.pending,           // Funds in 48-hour dispute window
      available: balance.available,       // Funds ready to withdraw
      total: balance.total,               // pending + available

      // Breakdown in cents
      pending_cents: balance.pending_cents,
      available_cents: balance.available_cents,
      total_cents: balance.total_cents,

      // Payment method status
      has_bank_account: !!user.stripe_account_id && !!user.stripe_onboarding_complete,
      has_wallet: !!user.wallet_address,
      wallet_address: user.wallet_address || null,

      // Transaction details
      transactions: balance.transactions
    });
  } catch (error) {
    console.error('Error fetching wallet status:', error);
    res.status(500).json({ error: 'Failed to fetch wallet status' });
  }
});

// ============ WALLET ADDRESS (USDC) ============
app.get('/api/wallet/address', async (req, res) => {
  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  res.json({ wallet_address: user.wallet_address || null, has_wallet: !!user.wallet_address });
});

app.put('/api/wallet/address', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { wallet_address } = req.body;

  if (!wallet_address) {
    // Clear wallet address
    await supabase.from('users').update({ wallet_address: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    return res.json({ success: true, wallet_address: null });
  }

  if (!isValidWalletAddress(wallet_address)) {
    return res.status(400).json({ error: 'Invalid wallet address. Must be a valid Ethereum/Base address (0x...)' });
  }

  await supabase.from('users').update({ wallet_address, updated_at: new Date().toISOString() }).eq('id', user.id);
  res.json({ success: true, wallet_address });
});

app.get('/api/admin/pending-stats', async (req, res) => {
  try {
    const user = await getUserByToken(req.headers.authorization);
    if (!user || !isAdmin(user.id)) {
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

// ============ AUTO-MIGRATION ============
// Ensures required columns exist on the tasks table
async function ensureTaskColumns() {
  if (!supabase) return;
  const requiredColumns = [
    { name: 'spots_filled', check: 'spots_filled' },
    { name: 'is_anonymous', check: 'is_anonymous' },
    { name: 'duration_hours', check: 'duration_hours' },
  ];

  for (const col of requiredColumns) {
    const { error } = await supabase.from('tasks').select(col.check).limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log(`[Migration] Column '${col.name}' missing from tasks table.`);
      // Try adding via a migration function
      const { error: rpcErr } = await supabase.rpc('run_migration', {
        migration_sql: `ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ${col.name} ${col.name === 'spots_filled' ? 'integer DEFAULT 0' : col.name === 'is_anonymous' ? 'boolean DEFAULT false' : 'numeric DEFAULT null'}`
      });
      if (rpcErr) {
        console.log(`[Migration] Cannot auto-add '${col.name}'. Please run in Supabase SQL Editor:`);
        console.log(`  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ${col.name} ${col.name === 'spots_filled' ? 'integer DEFAULT 0' : col.name === 'is_anonymous' ? 'boolean DEFAULT false' : 'numeric DEFAULT null'};`);
      } else {
        console.log(`[Migration] Successfully added '${col.name}' column.`);
      }
    }
  }
}

// Global flags for which columns exist (checked at startup)
const taskColumnFlags = {
  spots_filled: true,
  is_anonymous: true,
  duration_hours: true,
  review_deadline: true,
  // Task validation system columns
  task_type_id: true,
  location_zone: true,
  private_address: true,
  private_notes: true,
  private_contact: true,
  validation_attempts: true,
  // Audit lifecycle columns
  escrow_captured: true,
  auth_hold_expires_at: true,
  rejection_feedback: true,
  auto_approved: true,
  revision_count: true,
  deadline_warning_sent: true,
  instructions_attachments: true,
  // Cancellation columns (migration 002)
  cancelled_at: true,
  cancellation_reason: true,
};

let userHasGenderColumn = true;

async function checkTaskColumns() {
  if (!supabase) return;
  for (const col of Object.keys(taskColumnFlags)) {
    const { error } = await supabase.from('tasks').select(col).limit(1);
    taskColumnFlags[col] = !error;
    if (error) {
      console.log(`[Schema] Column 'tasks.${col}' not found — feature will be disabled until migration runs.`);
    }
  }
  console.log('[Schema] Task columns:', JSON.stringify(taskColumnFlags));
}

// ============ START ============
async function start() {
  console.log('🚀 irlwork.ai API starting...');

  if (supabase) {
    console.log('✅ Supabase connected');

    // Check and report missing columns
    await ensureTaskColumns();
    await checkTaskColumns();
    await checkUserColumns();

    // Ensure avatar_data column exists on users table
    const { error: avatarColCheck } = await supabase.from('users').select('avatar_data').limit(1);
    if (avatarColCheck && avatarColCheck.message && avatarColCheck.message.includes('does not exist')) {
      console.log('[Migration] avatar_data column missing from users table, attempting to add...');
      const { error: rpcErr } = await supabase.rpc('run_migration', {
        migration_sql: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_data TEXT'
      });
      if (rpcErr) {
        console.log('[Migration] Cannot auto-add avatar_data. Please run in Supabase SQL Editor:');
        console.log('  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_data TEXT;');
      } else {
        console.log('[Migration] Successfully added avatar_data column to users table.');
      }
    } else {
      console.log('[Schema] users.avatar_data column exists');
    }

    // Ensure gender column exists on users table
    const { error: genderColCheck } = await supabase.from('users').select('gender').limit(1);
    if (genderColCheck && genderColCheck.message && genderColCheck.message.includes('does not exist')) {
      console.log('[Migration] gender column missing from users table, attempting to add...');
      const { error: rpcErr } = await supabase.rpc('run_migration', {
        migration_sql: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)'
      });
      if (rpcErr) {
        userHasGenderColumn = false;
        console.log('[Migration] Cannot auto-add gender. Please run in Supabase SQL Editor:');
        console.log('  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);');
      } else {
        console.log('[Migration] Successfully added gender column to users table.');
      }
    } else {
      console.log('[Schema] users.gender column exists');
    }

    // DISABLED FOR PHASE 1 MANUAL OPERATIONS — see _automated_disabled/
    // Start background services
    // console.log('🔄 Starting background services...');
    // autoReleaseService.start();
    // console.log('   ✅ Auto-release service started (48h threshold)');

    // Pre-provision Stripe subscription products/prices if not configured via env vars
    try {
      const { ensureStripePrices } = require('./backend/services/subscriptionService');
      await ensureStripePrices();
      console.log('   ✅ Stripe subscription prices verified');
    } catch (e) {
      console.warn('   ⚠️ Stripe subscription setup:', e.message);
    }

    // Start balance promoter (promotes pending → available after 48 hours)
    startBalancePromoter(supabase, createNotification, sendEmailNotification);
    console.log('   ✅ Balance promoter started (15min interval)');

    // Start email queue processor (processes pending notification emails)
    if (_emailService) {
      _emailService.startQueueProcessor(parseInt(process.env.EMAIL_QUEUE_INTERVAL_MS) || 60000);
    }

    // Start task expiry service
    // Two expiry rules:
    //   1. Open tasks past their deadline with no one assigned → expire immediately
    //   2. Open tasks with no deadline older than 30 days → expire as stale
    const TASK_EXPIRY_DAYS = 30;
    const TASK_EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
    async function expireOpenTasks() {
      try {
        const now = new Date().toISOString();

        // Rule 1: Expire open tasks past their deadline (no human assigned)
        const { data: deadlineExpired, error: deadlineErr } = await supabase
          .from('tasks')
          .update({
            status: 'expired',
            updated_at: now
          })
          .eq('status', 'open')
          .is('human_id', null)
          .not('deadline', 'is', null)
          .lt('deadline', now)
          .select('id, agent_id, title, deadline');

        if (deadlineErr) {
          console.error('[TaskExpiry] Deadline expiry error:', deadlineErr.message);
        } else if (deadlineExpired && deadlineExpired.length > 0) {
          console.log(`[TaskExpiry] Expired ${deadlineExpired.length} tasks past their deadline`);
          for (const task of deadlineExpired) {
            if (task.agent_id) {
              await createNotification(
                task.agent_id,
                'task_expired',
                'Task Expired',
                `Your task "${task.title}" expired because its deadline passed without anyone accepting it. You can repost it anytime.`,
                `/tasks/${task.id}`
              );
            }
          }
        }

        // Rule 2: Expire open tasks without a deadline after 30 days
        const cutoff = new Date(Date.now() - TASK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: staleExpired, error: staleErr } = await supabase
          .from('tasks')
          .update({
            status: 'expired',
            updated_at: now
          })
          .eq('status', 'open')
          .is('human_id', null)
          .lt('created_at', cutoff)
          .select('id, agent_id, title');

        if (staleErr) {
          console.error('[TaskExpiry] Stale expiry error:', staleErr.message);
        } else if (staleExpired && staleExpired.length > 0) {
          console.log(`[TaskExpiry] Expired ${staleExpired.length} stale tasks (>${TASK_EXPIRY_DAYS} days old)`);
          for (const task of staleExpired) {
            if (task.agent_id) {
              await createNotification(
                task.agent_id,
                'task_expired',
                'Task Expired',
                `Your task "${task.title}" expired after ${TASK_EXPIRY_DAYS} days without applicants. You can repost it anytime.`,
                `/tasks/${task.id}`
              );
            }
          }
        }
        // Rule 3: Expire pending_acceptance tasks past their 24-hour review deadline
        const { data: reviewExpired, error: reviewErr } = await supabase
          .from('tasks')
          .update({
            status: 'open',
            human_id: null,
            human_ids: [],
            spots_filled: 0,
            review_deadline: null,
            updated_at: now
          })
          .eq('status', 'pending_acceptance')
          .not('review_deadline', 'is', null)
          .lt('review_deadline', now)
          .select('id, agent_id, human_id, title');

        if (reviewErr) {
          console.error('[TaskExpiry] Review expiry error:', reviewErr.message);
        } else if (reviewExpired && reviewExpired.length > 0) {
          console.log(`[TaskExpiry] Reverted ${reviewExpired.length} pending_acceptance tasks (review period expired)`);
          for (const task of reviewExpired) {
            if (task.agent_id) {
              await createNotification(
                task.agent_id,
                'task_offer_expired',
                'Offer Expired',
                `The worker did not respond to your task "${task.title}" within 24 hours. The task is back to open.`,
                `/tasks/${task.id}`
              );
            }
            if (task.human_id) {
              await createNotification(
                task.human_id,
                'task_offer_expired',
                'Offer Expired',
                `Your offer for "${task.title}" expired because you did not respond within 24 hours.`,
                `/tasks/${task.id}`
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'Task expiry error');
        captureException(err, { tags: { service: 'task_expiry' } });
      }
    }
    // Run once on startup, then on interval
    expireOpenTasks();
    setInterval(expireOpenTasks, TASK_EXPIRY_INTERVAL_MS);
    console.log(`   ✅ Task expiry service started (deadline + ${TASK_EXPIRY_DAYS}-day stale + review expiry, hourly check)`);

    // ---- Auth Hold Renewal (every 6 hours) ----
    async function renewExpiringAuthHolds() {
      try {
        const { authorizeEscrow, cancelEscrowHold } = require('./backend/services/stripeService');
        // Find assigned tasks with auth holds expiring within 24 hours
        const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: expiringTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'assigned')
          .eq('escrow_captured', false)
          .not('auth_hold_expires_at', 'is', null)
          .lt('auth_hold_expires_at', cutoff)
          .gt('auth_hold_expires_at', new Date().toISOString()); // not yet expired

        for (const task of (expiringTasks || [])) {
          try {
            // Cancel old PI
            await cancelEscrowHold(task.stripe_payment_intent_id);
            // Create new auth hold
            const amountCents = Math.round((task.escrow_amount || task.budget || 0) * 100);
            const newAuth = await authorizeEscrow(supabase, task.agent_id, task.id, amountCents);

            if (newAuth.requires_action) {
              // 3DS required on renewal — notify agent
              await createNotification(task.agent_id, 'auth_hold_failed', 'Payment Hold Expiring',
                `Your payment hold for "${task.title}" could not be renewed. Please update your payment method within 24 hours or the task will be cancelled.`,
                `/tasks/${task.id}`);
              // Set a short expiry so next cycle auto-cancels if still unresolved
              await supabase.from('tasks').update({
                auth_hold_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
              }).eq('id', task.id);
              continue;
            }

            await supabase.from('tasks').update({
              stripe_payment_intent_id: newAuth.payment_intent_id,
              auth_hold_expires_at: newAuth.auth_hold_expires_at,
              updated_at: new Date().toISOString()
            }).eq('id', task.id);

            console.log(`[AuthRenewal] Renewed auth hold for task ${task.id}`);
          } catch (err) {
            console.error(`[AuthRenewal] Failed for task ${task.id}:`, err.message);
            await createNotification(task.agent_id, 'auth_hold_failed', 'Payment Hold Failed',
              `Your payment hold for "${task.title}" could not be renewed. Update your payment method or the task may be cancelled.`,
              `/tasks/${task.id}`);
          }
        }

        // Auto-cancel tasks with expired auth holds (hold expired AND past grace)
        const { data: expiredHolds } = await supabase
          .from('tasks')
          .select('id, stripe_payment_intent_id, agent_id, human_id, title')
          .eq('status', 'assigned')
          .eq('escrow_captured', false)
          .lt('auth_hold_expires_at', new Date().toISOString());

        for (const task of (expiredHolds || [])) {
          const { data: cancelled } = await supabase.from('tasks').update(cleanTaskData({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Auth hold expired — payment method issue',
            updated_at: new Date().toISOString()
          })).eq('id', task.id).eq('status', 'assigned').select('id').single();

          if (!cancelled) continue;

          await createNotification(task.agent_id, 'task_cancelled', 'Task Auto-Cancelled',
            `Task "${task.title}" was cancelled because the payment hold expired.`, `/tasks/${task.id}`);
          if (task.human_id) {
            await createNotification(task.human_id, 'task_cancelled', 'Task Cancelled',
              `Task "${task.title}" was cancelled due to a payment issue with the requester.`, `/tasks/${task.id}`);
          }
          console.log(`[AuthRenewal] Auto-cancelled task ${task.id} — auth hold expired`);
        }
      } catch (err) {
        console.error('[AuthRenewal] Error:', err.message);
      }
    }
    // Run every 6 hours
    renewExpiringAuthHolds();
    setInterval(renewExpiringAuthHolds, 6 * 60 * 60 * 1000);
    console.log('   ✅ Auth hold renewal service started (every 6 hours)');

    // ---- Webhook Retry Queue Processor (every 60 seconds) ----
    async function processWebhookQueue() {
      try {
        // Pick up to 10 pending/failed deliveries ready for retry
        const { data: deliveries, error: fetchErr } = await supabase
          .from('webhook_deliveries')
          .select('id, user_id, event_type, payload, attempts, max_attempts')
          .in('status', ['pending', 'failed'])
          .lt('next_retry_at', new Date().toISOString())
          .order('next_retry_at', { ascending: true })
          .limit(10);

        if (fetchErr) {
          // Table may not exist yet — silent fail
          if (!fetchErr.message?.includes('does not exist')) {
            console.error('[WebhookQueue] Fetch error:', fetchErr.message);
          }
          return;
        }

        if (!deliveries || deliveries.length === 0) return;

        for (const delivery of deliveries) {
          try {
            // Fetch user's webhook config
            const { data: webhookUser } = await supabase
              .from('users')
              .select('webhook_url, webhook_secret')
              .eq('id', delivery.user_id)
              .single();

            if (!webhookUser?.webhook_url) {
              // No webhook URL — mark as exhausted
              await supabase.from('webhook_deliveries').update({
                status: 'exhausted',
                last_error: 'No webhook URL configured for user'
              }).eq('id', delivery.id);
              continue;
            }

            if (!isValidWebhookUrl(webhookUser.webhook_url)) {
              await supabase.from('webhook_deliveries').update({
                status: 'exhausted',
                last_error: 'Invalid webhook URL'
              }).eq('id', delivery.id);
              continue;
            }

            const headers = { 'Content-Type': 'application/json' };
            if (webhookUser.webhook_secret) {
              const signature = crypto
                .createHmac('sha256', webhookUser.webhook_secret)
                .update(JSON.stringify(delivery.payload))
                .digest('hex');
              headers['X-Webhook-Signature'] = signature;
            }

            const response = await fetch(webhookUser.webhook_url, {
              method: 'POST',
              headers,
              body: JSON.stringify(delivery.payload),
              signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
              await supabase.from('webhook_deliveries').update({
                status: 'delivered',
                delivered_at: new Date().toISOString(),
                attempts: delivery.attempts + 1
              }).eq('id', delivery.id);
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (deliveryErr) {
            const newAttempts = delivery.attempts + 1;
            if (newAttempts >= delivery.max_attempts) {
              await supabase.from('webhook_deliveries').update({
                status: 'exhausted',
                attempts: newAttempts,
                last_error: deliveryErr.message
              }).eq('id', delivery.id);
            } else {
              // Exponential backoff: 1min, 5min, 30min, 2hr, 12hr
              const backoffMs = [60, 300, 1800, 7200, 43200][newAttempts - 1] * 1000;
              const nextRetry = new Date(Date.now() + backoffMs).toISOString();
              await supabase.from('webhook_deliveries').update({
                status: 'failed',
                attempts: newAttempts,
                last_error: deliveryErr.message,
                next_retry_at: nextRetry
              }).eq('id', delivery.id);
            }
          }
        }
      } catch (err) {
        // Don't log if table doesn't exist yet
        if (!err.message?.includes('does not exist')) {
          console.error('[WebhookQueue] Processor error:', err.message);
        }
      }
    }
    processWebhookQueue();
    setInterval(processWebhookQueue, 60 * 1000); // every 60 seconds
    console.log('   ✅ Webhook retry queue processor started (every 60s)');

  } else {
    console.log('⚠️  Supabase not configured (set SUPABASE_URL and SUPABASE_ANON_KEY)');
  }

  // Sentry error handler — MUST be after all routes but before final error handler
  app.use(sentryErrorHandler());

  // Final error handler — catch-all for unhandled errors
  app.use((err, req, res, next) => {
    logger.error({ err, req_id: req.id, method: req.method, path: req.path }, 'Unhandled error');
    res.status(err.status || 500).json({ error: 'Internal server error' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `Server running on port ${PORT}`);
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
      creator:users!agent_id(id, name),
      assignee:users!human_id(id, name)
    `)
    .order('created_at', { ascending: false });

  if (user.type === 'human') {
    // Humans see only tasks they are assigned to work on (not tasks they posted)
    query = query.eq('human_id', user.id);
  } else {
    // Agents see tasks they created
    query = query.eq('agent_id', user.id);
  }
  
  const { data: tasks, error } = await query;
  
  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
  res.json(tasks || []);
});

// ============ TASKS CRUD ============

app.patch('/api/tasks/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  // Whitelist of fields that agents are allowed to update
  const ALLOWED_TASK_UPDATE_FIELDS = [
    'title', 'description', 'category', 'budget', 'location', 'latitude', 'longitude',
    'urgency', 'required_skills', 'is_remote', 'duration_hours', 'spots_total',
    'deadline', 'instructions', 'payment_type'
  ];

  const updates = {};
  for (const field of ALLOWED_TASK_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Verify ownership (agent_id is the actual column in the tasks table)
  const { data: task } = await supabase
    .from('tasks')
    .select('agent_id, status')
    .eq('id', id)
    .single();

  if (!task || task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Only allow editing open tasks
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'Can only edit tasks with status "open"' });
  }

  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return res.status(500).json({ error: safeErrorMessage(error) });
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

  // Fetch the full task to check status and payment info
  const { data: task, error: taskFetchErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (taskFetchErr || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Accept from pending_acceptance (agent hired this human, charge agent's card now)
  if (task.status === 'pending_acceptance') {
    // Verify this human is the one who was offered the task
    const isOffered = task.human_id === user.id ||
      (Array.isArray(task.human_ids) && task.human_ids.includes(user.id));
    if (!isOffered) {
      return res.status(403).json({ error: 'This task was not offered to you' });
    }

    // Check review deadline
    if (task.review_deadline && new Date(task.review_deadline) < new Date()) {
      return res.status(410).json({ error: 'The review period has expired. This offer is no longer available.' });
    }

    const budgetAmount = task.escrow_amount || task.budget || 50;
    const budgetCents = Math.round(budgetAmount * 100);

    // USDC tasks: escrow funded externally — skip Stripe charge
    if (task.payment_method === 'usdc') {
      // For USDC, escrow must already be deposited on-chain before work starts.
      // If escrow is still pending_deposit, the human can accept but work waits for funding.
      const escrowReady = task.escrow_status === 'deposited' || task.escrow_status === 'held';

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(cleanTaskData({
          status: escrowReady ? 'in_progress' : 'assigned',
          assigned_at: new Date().toISOString(),
          work_started_at: escrowReady ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }))
        .eq('id', id)
        .eq('status', 'pending_acceptance')
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

      // Auto-create conversation for task communication
      const usdcConvId = uuidv4();
      await supabase.from('conversations').upsert(
        { id: usdcConvId, human_id: user.id, agent_id: task.agent_id, task_id: id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'human_id,agent_id,task_id', ignoreDuplicates: true }
      );

      // Reject other pending applicants and notify them
      const { data: usdcRejectedApps } = await supabase
        .from('task_applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('task_id', id).neq('human_id', user.id).eq('status', 'pending')
        .select('human_id');

      for (const app of (usdcRejectedApps || [])) {
        await createNotification(app.human_id, 'application_rejected', 'Not Selected',
          `Another worker was selected for "${task.title}". Browse other tasks →`, '/tasks');
      }

      if (task.agent_id) {
        await createNotification(
          task.agent_id,
          'task_accepted',
          'Task Accepted',
          `${user.name || 'A worker'} has accepted your task "${task.title}".${escrowReady ? ' Work can begin.' : ' Waiting for USDC escrow deposit.'}`,
          `/tasks/${id}`
        );
      }

      return res.json({
        success: true,
        status: escrowReady ? 'in_progress' : 'assigned',
        escrow_status: task.escrow_status,
        payment_method: 'usdc',
        message: escrowReady
          ? 'Task accepted. USDC escrow is funded — work can begin.'
          : 'Task accepted. Waiting for USDC escrow deposit before work can start.'
      });
    }

    // STRIPE PATH: Charge the agent's card now (budget + poster fee)
    const { chargeAgentForTask, refundPaymentIntent } = require('./backend/services/stripeService');

    // Look up poster's tier for poster fee calculation
    const { data: poster } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', task.agent_id)
      .single();
    const posterTier = poster?.subscription_tier || 'free';
    const posterFeeCents = calculatePosterFee(budgetCents, posterTier);
    const totalChargeCents = budgetCents + posterFeeCents;

    // Look up worker's tier for worker fee locking
    const workerFeePercent = getTierConfig(user.subscription_tier || 'free').worker_fee_percent;

    let chargeResult;
    try {
      chargeResult = await chargeAgentForTask(supabase, task.agent_id, id, totalChargeCents);
    } catch (stripeError) {
      console.error(`[Accept] Payment failed for task ${id}:`, stripeError.message);
      return res.status(402).json({
        error: 'Payment failed',
        code: 'payment_error',
        message: 'The agent\'s payment could not be processed. The task cannot start until payment succeeds. Please contact the agent.'
      });
    }

    // Atomic update: move to in_progress with payment info and locked fees
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(cleanTaskData({
        status: 'in_progress',
        escrow_status: 'deposited',
        escrow_deposited_at: new Date().toISOString(),
        stripe_payment_intent_id: chargeResult.payment_intent_id,
        poster_fee_percent: getTierConfig(posterTier).poster_fee_percent,
        poster_fee_cents: posterFeeCents,
        worker_fee_percent: workerFeePercent,
        total_charge_cents: totalChargeCents,
        assigned_at: new Date().toISOString(),
        work_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      .eq('id', id)
      .eq('status', 'pending_acceptance')
      .select('id')
      .single();

    if (error || !updatedTask) {
      // Task was already accepted or changed — refund the charge
      try {
        await refundPaymentIntent(chargeResult.payment_intent_id, 'duplicate');
        console.log(`[Accept] Refunded charge for task ${id} (concurrent accept)`);
      } catch (refundErr) {
        console.error(`[Accept] CRITICAL: Failed to refund charge for task ${id}:`, refundErr);
      }
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

    // Auto-create conversation for task communication
    const acceptConvId = uuidv4();
    await supabase.from('conversations').upsert(
      { id: acceptConvId, human_id: user.id, agent_id: task.agent_id, task_id: id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'human_id,agent_id,task_id', ignoreDuplicates: true }
    );

    // Reject other pending applicants and notify them
    const { data: rejectedApps } = await supabase
      .from('task_applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('task_id', id).neq('human_id', user.id).eq('status', 'pending')
      .select('human_id');

    for (const app of (rejectedApps || [])) {
      await createNotification(app.human_id, 'application_rejected', 'Not Selected',
        `Another worker was selected for "${task.title}". Browse other tasks →`, '/tasks');
    }

    // Notify the agent
    if (task.agent_id) {
      await createNotification(
        task.agent_id,
        'task_accepted',
        'Task Accepted',
        `${user.name || 'A worker'} has accepted your task "${task.title}". Payment has been charged and work can begin.`,
        `/tasks/${id}`
      );

      // Dispatch webhook to agent
      dispatchWebhook(task.agent_id, {
        type: 'task_accepted',
        task_id: id,
        data: {
          human_id: user.id,
          human_name: user.name,
          title: task.title,
          status: 'in_progress',
          escrow_status: 'deposited'
        }
      }).catch(() => {});

      // Email notification for task assignment
      const acceptTaskUrl = `https://www.irlwork.ai/tasks/${id}`;
      sendEmailNotification(task.agent_id,
        `"${task.title}" has been accepted`,
        `<div style="background: #ECFDF5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #065F46; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Task Accepted</p>
          <p style="color: #1A1A1A; font-size: 14px; margin: 0;"><strong>${user.name || 'A worker'}</strong> accepted your task "${task.title}". Payment has been charged and work can begin.</p>
        </div>
        <a href="${acceptTaskUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Task</a>`
      ).catch(() => {});
    }

    return res.json({ success: true, status: 'in_progress', escrow_status: 'deposited' });
  }

  // Accept from open status (original flow — human browsing open tasks)
  // If escrow is already funded (agent set up payment via /assign first), start work.
  // Otherwise, mark as assigned and require agent to fund escrow before work begins.
  const escrowFunded = task.escrow_status === 'deposited' || task.escrow_status === 'held';
  const acceptStatus = escrowFunded ? 'in_progress' : 'assigned';

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update({
      status: acceptStatus,
      human_id: user.id,
      assigned_at: new Date().toISOString(),
      work_started_at: escrowFunded ? new Date().toISOString() : null,
      escrow_status: task.escrow_status || 'unfunded',
      updated_at: new Date().toISOString()
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

  // Auto-create conversation for task communication
  const openConvId = uuidv4();
  await supabase.from('conversations').upsert(
    { id: openConvId, human_id: user.id, agent_id: task.agent_id, task_id: id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'human_id,agent_id,task_id', ignoreDuplicates: true }
  );

  // Reject other pending applicants and notify them
  const { data: openRejectedApps } = await supabase
    .from('task_applications')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('task_id', id).neq('human_id', user.id).eq('status', 'pending')
    .select('human_id');

  for (const app of (openRejectedApps || [])) {
    await createNotification(app.human_id, 'application_rejected', 'Not Selected',
      `Another worker was selected for "${task.title}". Browse other tasks →`, '/tasks');
  }

  // Get the task details to notify the agent
  const { data: acceptedTask } = await supabase
    .from('tasks')
    .select('agent_id, title')
    .eq('id', id)
    .single();

  if (acceptedTask?.agent_id) {
    await createNotification(
      acceptedTask.agent_id,
      'task_accepted',
      'Task Accepted',
      `${user.name || 'A worker'} has accepted your task "${acceptedTask.title}".${escrowFunded ? ' Work can begin.' : ' Please fund escrow so work can start.'}`,
      `/tasks/${id}`
    );

    // Dispatch webhook to agent
    dispatchWebhook(acceptedTask.agent_id, {
      type: 'task_accepted',
      task_id: id,
      data: {
        human_id: user.id,
        human_name: user.name,
        title: acceptedTask.title,
        status: 'in_progress'
      }
    }).catch(() => {});

    // Email notification for task assignment
    const openAcceptTaskUrl = `https://www.irlwork.ai/tasks/${id}`;
    sendEmailNotification(acceptedTask.agent_id,
      `"${acceptedTask.title}" has been accepted`,
      `<div style="background: #ECFDF5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="color: #065F46; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Task Accepted</p>
        <p style="color: #1A1A1A; font-size: 14px; margin: 0;"><strong>${user.name || 'A worker'}</strong> accepted your task "${acceptedTask.title}".</p>
      </div>
      <a href="${openAcceptTaskUrl}" style="display: inline-block; background: #E07A5F; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Task</a>`
    ).catch(() => {});
  }

  res.json({
    success: true,
    status: acceptStatus,
    escrow_status: task.escrow_status || 'unfunded',
    message: escrowFunded
      ? 'Task accepted. Escrow is funded — work can begin.'
      : 'Task accepted. Waiting for agent to fund escrow before work can start.'
  });
});

// Confirm payment after 3DS authentication
app.post('/api/tasks/:id/confirm-payment', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: taskId } = req.params;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, agent_id, human_id, title, status, stripe_payment_intent_id, escrow_amount, budget')
    .eq('id', taskId)
    .single();

  if (taskError || !task) return res.status(404).json({ error: 'Task not found' });

  // Auth: must be the agent
  if (task.agent_id !== user.id) {
    return res.status(403).json({ error: 'Only the task creator can confirm payment' });
  }

  if (task.status !== 'pending_acceptance') {
    return res.status(400).json({ error: `Task is in '${task.status}' status, not pending_acceptance` });
  }

  if (!task.stripe_payment_intent_id) {
    return res.status(400).json({ error: 'No payment intent associated with this task' });
  }

  // Retrieve PaymentIntent from Stripe
  const stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);
  let pi;
  try {
    pi = await stripeInstance.paymentIntents.retrieve(task.stripe_payment_intent_id);
  } catch (stripeErr) {
    console.error(`[ConfirmPayment] Stripe retrieve failed for ${task.stripe_payment_intent_id}:`, stripeErr.message);
    return res.status(502).json({ error: 'Failed to verify payment status with Stripe' });
  }

  if (pi.status === 'requires_capture') {
    // 3DS succeeded — auth hold is in place, assign the task
    const authHoldExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('tasks')
      .update(cleanTaskData({
        status: 'assigned',
        escrow_status: 'authorized',
        auth_hold_expires_at: authHoldExpiresAt,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      .eq('id', taskId)
      .eq('status', 'pending_acceptance')
      .select('id')
      .single();

    if (updateErr || !updated) {
      return res.status(409).json({ error: 'Task status changed before payment could be confirmed' });
    }

    // Reject other applicants
    const { data: rejectedApps } = await supabase
      .from('task_applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('task_id', taskId).neq('human_id', task.human_id).eq('status', 'pending')
      .select('human_id');
    for (const app of (rejectedApps || [])) {
      await createNotification(app.human_id, 'application_rejected', 'Not Selected',
        `Another worker was selected for "${task.title}". Browse other tasks ->`, '/tasks');
    }

    await createNotification(task.agent_id, 'payment_confirmed', 'Payment Verified',
      `Payment for "${task.title}" has been verified. Task is now assigned.`,
      `/tasks/${taskId}`);
    if (task.human_id) {
      await createNotification(task.human_id, 'task_assigned', 'You\'ve Been Assigned',
        `You've been assigned to "${task.title}". Review the instructions and start when ready.`,
        `/tasks/${taskId}`);
    }

    return res.json({ success: true, status: 'assigned', escrow_status: 'authorized' });
  }

  if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
    return res.status(402).json({
      error: 'authentication_pending',
      message: 'Card authentication has not been completed yet. Please complete the verification.',
      client_secret: pi.client_secret
    });
  }

  if (pi.status === 'canceled') {
    await supabase.from('tasks')
      .update({ status: 'open', human_id: null, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('status', 'pending_acceptance');
    return res.status(400).json({
      error: 'payment_cancelled',
      message: 'Payment was cancelled. The task has been reopened.'
    });
  }

  if (pi.status === 'requires_payment_method') {
    return res.status(402).json({
      error: 'payment_failed',
      message: 'Payment method was declined. Please update your payment method and try again.'
    });
  }

  // Any other unexpected status
  console.warn(`[ConfirmPayment] Unexpected PI status '${pi.status}' for task ${taskId}`);
  return res.status(400).json({
    error: 'unexpected_payment_status',
    message: `Unexpected payment status: ${pi.status}. Please contact support.`
  });
});

app.post('/api/tasks/:id/decline', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.type !== 'human') {
    return res.status(403).json({ error: 'Only humans can decline tasks' });
  }

  const { id } = req.params;
  const { reason } = req.body || {};

  // Fetch task
  const { data: task, error: taskFetchErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (taskFetchErr || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status !== 'pending_acceptance') {
    return res.status(400).json({ error: 'Can only decline tasks that are pending your acceptance' });
  }

  // Verify this human was offered the task
  const isOffered = task.human_id === user.id ||
    (Array.isArray(task.human_ids) && task.human_ids.includes(user.id));
  if (!isOffered) {
    return res.status(403).json({ error: 'This task was not offered to you' });
  }

  // Remove this human from the task and revert to open
  const updatedHumanIds = (Array.isArray(task.human_ids) ? task.human_ids : [])
    .filter(hid => hid !== user.id);

  const { error } = await supabase
    .from('tasks')
    .update(cleanTaskData({
      status: 'open',
      human_id: updatedHumanIds[0] || null,
      human_ids: updatedHumanIds,
      spots_filled: updatedHumanIds.length,
      review_deadline: null,
      updated_at: new Date().toISOString()
    }))
    .eq('id', id)
    .eq('status', 'pending_acceptance');

  if (error) {
    return res.status(500).json({ error: safeErrorMessage(error) });
  }

  // Notify the agent
  if (task.agent_id) {
    await createNotification(
      task.agent_id,
      'task_declined',
      'Task Declined',
      `${user.name || 'A worker'} declined your task "${task.title}"${reason ? ': ' + reason : ''}. The task is back to open.`,
      `/tasks/${id}`
    );

    // Dispatch webhook to agent
    dispatchWebhook(task.agent_id, {
      type: 'task_declined',
      task_id: id,
      data: {
        human_id: user.id,
        human_name: user.name,
        title: task.title,
        reason: reason || null,
        status: 'open'
      }
    }).catch(() => {});
  }

  res.json({ success: true, message: 'Task declined. The agent has been notified.' });
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

  // Only allow starting tasks that are in 'assigned' or 'accepted' status
  const startableStatuses = ['assigned', 'accepted'];
  if (!startableStatuses.includes(task.status)) {
    return res.status(400).json({ error: `Cannot start a task with status "${task.status}". Task must be assigned first.` });
  }

  // Capture escrow if auth hold exists and hasn't been captured yet
  if (task.stripe_payment_intent_id && !task.escrow_captured) {
    const { captureEscrow } = require('./backend/services/stripeService');
    try {
      await captureEscrow(task.stripe_payment_intent_id);
    } catch (captureErr) {
      console.error(`[Start] Escrow capture failed for task ${id}:`, captureErr.message);
      return res.status(402).json({
        error: 'capture_failed',
        message: 'Payment capture failed. Please contact the task requester.'
      });
    }

    // Atomic update with capture confirmation
    const { data: startedTask, error: startErr } = await supabase
      .from('tasks')
      .update(cleanTaskData({
        status: 'in_progress',
        escrow_status: 'deposited',
        escrow_deposited_at: new Date().toISOString(),
        escrow_captured: true,
        escrow_captured_at: new Date().toISOString(),
        work_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      .eq('id', id)
      .eq('status', 'assigned')
      .select('id')
      .single();

    if (startErr || !startedTask) {
      return res.status(409).json({ error: 'Task status changed before work could start.' });
    }
  } else {
    // No Stripe PI (USDC/legacy) or already captured — just update status
    const { data: startedTask, error: startErr } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        work_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .in('status', startableStatuses)
      .select('id')
      .single();

    if (startErr || !startedTask) {
      return res.status(409).json({ error: 'Task status changed before work could start.' });
    }
  }

  // Notify agent that work has started
  if (task.agent_id) {
    await createNotification(
      task.agent_id,
      'task_started',
      'Work Started',
      `${user.name || 'The worker'} has started work on "${task.title}".`,
      `/tasks/${id}`
    );
    dispatchWebhook(task.agent_id, { type: 'task_started', task_id: id, data: {} });
  }

  res.json({ success: true, status: 'in_progress' });
});

app.post('/api/tasks/:id/cancel', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await getUserByToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const isAgent = task.agent_id === user.id;
  const isWorker = task.human_id === user.id;

  if (!isAgent && !isWorker) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // ===== WORKER WITHDRAWAL =====
  if (isWorker) {
    const workerCancellable = ['assigned', 'in_progress'];
    if (!workerCancellable.includes(task.status)) {
      return res.status(400).json({
        error: `Cannot withdraw from a task with status "${task.status}". You can only withdraw from assigned or in-progress tasks.`
      });
    }

    // Refund escrow if funded
    if (task.escrow_status === 'deposited' && task.stripe_payment_intent_id) {
      try {
        const { refundPaymentIntent } = require('./backend/services/stripeService');
        await refundPaymentIntent(task.stripe_payment_intent_id, 'requested_by_customer');
        console.log(`[Cancel] Refunded escrow for task ${id} (worker withdrawal)`);
      } catch (refundErr) {
        console.error(`[Cancel] Refund failed for task ${id}:`, refundErr.message);
        return res.status(500).json({ error: 'Failed to process refund. Please contact support.' });
      }
    } else if (task.stripe_payment_intent_id && !task.escrow_captured) {
      // Release auth hold if not yet captured
      try {
        const { cancelEscrowHold } = require('./backend/services/stripeService');
        await cancelEscrowHold(task.stripe_payment_intent_id);
        console.log(`[Cancel] Released auth hold for task ${id} (worker withdrawal)`);
      } catch (holdErr) {
        console.warn(`[Cancel] Auth hold release failed for task ${id}:`, holdErr.message);
      }
    }

    await supabase
      .from('tasks')
      .update(cleanTaskData({
        status: 'open',
        human_id: null,
        human_ids: [],
        spots_filled: 0,
        escrow_status: task.escrow_status === 'deposited' ? 'refunded' : task.escrow_status,
        assigned_at: null,
        work_started_at: null,
        updated_at: new Date().toISOString()
      }))
      .eq('id', id)
      .in('status', workerCancellable);

    // Mark worker's application as withdrawn
    await supabase
      .from('task_applications')
      .update({ status: 'withdrawn' })
      .eq('task_id', id)
      .eq('human_id', user.id);

    // Notify the agent
    if (task.agent_id) {
      await createNotification(
        task.agent_id,
        'worker_cancelled',
        'Worker Withdrew',
        `${user.name || 'The assigned worker'} has withdrawn from "${task.title}". The task has been reopened.`,
        `/tasks/${id}`
      );

      dispatchWebhook(task.agent_id, {
        type: 'worker_cancelled',
        task_id: id,
        data: {
          human_id: user.id,
          human_name: user.name,
          title: task.title,
          refunded: task.escrow_status === 'deposited'
        }
      }).catch(() => {});
    }

    return res.json({ success: true, action: 'withdrawn' });
  }

  // ===== AGENT CANCELLATION (tiered) =====
  const { cancellation_reason } = req.body || {};

  // Tier 1: Pre-work cancellation (free, no fees, no friction)
  if (['open', 'pending_acceptance', 'assigned'].includes(task.status)) {
    // Release auth hold if exists and escrow not yet captured
    if (task.stripe_payment_intent_id && !task.escrow_captured) {
      const { cancelEscrowHold } = require('./backend/services/stripeService');
      try {
        await cancelEscrowHold(task.stripe_payment_intent_id);
        console.log(`[Cancel] Released auth hold for task ${id}`);
      } catch (holdErr) {
        console.warn(`[Cancel] Auth hold release failed for task ${id}:`, holdErr.message);
      }
    }

    const { data: cancelledTask, error: cancelErr } = await supabase
      .from('tasks')
      .update(cleanTaskData({
        status: 'cancelled',
        escrow_status: task.stripe_payment_intent_id ? 'refunded' : task.escrow_status,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellation_reason || null,
        updated_at: new Date().toISOString()
      }))
      .eq('id', id)
      .in('status', ['open', 'pending_acceptance', 'assigned'])
      .select('id')
      .single();

    if (cancelErr || !cancelledTask) {
      return res.status(409).json({ error: 'Task status changed before cancellation could complete.' });
    }

    // Increment total_cancellations if a human was assigned
    if (['assigned', 'pending_acceptance'].includes(task.status) && task.human_id) {
      await supabase.rpc('increment_user_stat', {
        user_id_param: user.id, stat_name: 'total_cancellations', increment_by: 1
      });
    }

    // Notify the assigned human if one exists
    if (task.human_id) {
      await createNotification(
        task.human_id,
        'task_cancelled',
        'Task Cancelled',
        `The task "${task.title}" has been cancelled by the poster.`,
        `/tasks/${id}`
      );
    }

    // Fire webhook to agent
    dispatchWebhook(user.id, { type: 'task_cancelled', task_id: id, data: { tier: 'pre_work' } });

    return res.json({ success: true, tier: 'pre_work' });
  }

  // Tier 2: In-progress — cannot cancel, must dispute
  if (task.status === 'in_progress') {
    return res.status(409).json({
      error: 'task_in_progress',
      message: 'This task is in progress. Open a dispute if there is an issue.',
      action: 'dispute'
    });
  }

  // Proof submitted — cannot cancel
  if (task.status === 'pending_review') {
    return res.status(409).json({
      error: 'proof_submitted',
      message: 'Work has been submitted. Please approve, request a revision, or open a dispute.',
      actions: ['approve', 'reject', 'dispute']
    });
  }

  // Dispute active — cannot cancel
  if (task.status === 'disputed') {
    return res.status(409).json({
      error: 'dispute_active',
      message: 'A dispute is active. Cancellation is not available during dispute resolution.'
    });
  }

  // Any other status (paid, expired, cancelled) — terminal
  return res.status(400).json({
    error: `Cannot cancel a task with status "${task.status}".`
  });
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

  // Task must be in a disputable status (includes post-approval during 48-hour hold)
  const disputeableStatuses = ['pending_review', 'completed', 'approved', 'paid'];
  if (!disputeableStatuses.includes(task.status)) {
    return res.status(400).json({ error: 'Cannot dispute a task in this status' });
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

  // Freeze the pending funds (atomic: only freeze if still pending/available)
  const { error: freezeError, count: freezeCount } = await supabase
    .from('payouts')
    .update({ status: 'frozen' })
    .eq('id', payout.id)
    .in('status', ['pending', 'available']);

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
      evidence_urls: Array.isArray(evidence_urls) ? evidence_urls.slice(0, 10).filter(u => typeof u === 'string') : [],
      status: 'open',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (disputeError) {
    // Rollback: unfreeze the payment (only if we froze it)
    await supabase
      .from('payouts')
      .update({ status: 'pending' })
      .eq('id', payout.id)
      .eq('status', 'frozen');

    console.error('Failed to create dispute:', disputeError);
    return res.status(500).json({ error: 'Failed to create dispute. Please try again.' });
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
      filed_by_user:users!disputes_filed_by_fkey(id, name),
      filed_against_user:users!disputes_filed_against_fkey(id, name)
    `)
    .or(`filed_by.eq.${user.id},filed_against.eq.${user.id}`);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: disputes, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: safeErrorMessage(error) });
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
      filed_by_user:users!disputes_filed_by_fkey(id, name),
      filed_against_user:users!disputes_filed_against_fkey(id, name),
      resolved_by_user:users!disputes_resolved_by_fkey(id, name)
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

  // Admin check: only admins can resolve disputes (uses ADMIN_USER_IDS env var)
  if (!isAdmin(user.id)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { resolution, resolution_notes, refund_agent = false, release_to_human = false } = req.body;

  if (!resolution || !['approved', 'rejected', 'partial'].includes(resolution)) {
    return res.status(400).json({ error: 'Valid resolution required (approved, rejected, or partial)' });
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

  const task = dispute.task;
  const taskTitle = task?.title || 'Unknown';

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

  if (refund_agent) {
    // === REFUND AGENT: Return escrow via Stripe + freeze worker's pending balance ===
    if (task?.stripe_payment_intent_id) {
      try {
        const { refundPayment } = require('./backend/services/stripeService');
        await refundPayment(supabase, dispute.task_id, 'requested_by_customer');
      } catch (refundErr) {
        console.error(`[Dispute] Stripe refund failed for task ${dispute.task_id}:`, refundErr);
        return res.status(500).json({ error: 'Failed to process Stripe refund: ' + refundErr.message });
      }
    }

    // Freeze any pending_transactions for this task (prevent human from withdrawing)
    await supabase
      .from('pending_transactions')
      .update({ status: 'frozen', updated_at: new Date().toISOString() })
      .eq('task_id', dispute.task_id)
      .in('status', ['pending', 'available']);

    // Update payout status
    if (dispute.payout?.id) {
      await supabase.from('payouts').update({ status: 'refunded' }).eq('id', dispute.payout.id);
    }

    // Atomic task update with status precondition
    await supabase
      .from('tasks')
      .update({
        escrow_status: 'refunded',
        status: 'cancelled',
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', dispute.task_id)
      .eq('status', 'disputed');

    await createNotification(
      dispute.filed_by, 'dispute_resolved', 'Dispute Resolved - Refund Issued',
      `Your dispute for task "${taskTitle}" was approved. A refund has been issued.`,
      `/disputes/${id}`
    );
    await createNotification(
      dispute.filed_against, 'dispute_resolved', 'Dispute Resolved - Payment Withheld',
      `The dispute for task "${taskTitle}" was resolved against you. Payment has been withheld.`,
      `/disputes/${id}`
    );

  } else if (release_to_human) {
    // === RELEASE TO HUMAN: Pay the worker via Stripe pipeline ===
    try {
      await releasePaymentToPending(supabase, dispute.task_id, task.human_id, task.agent_id, createNotification);
    } catch (e) {
      return res.status(409).json({ error: e.message || 'Payment has already been released.' });
    }

    // Atomic task update with status precondition
    await supabase
      .from('tasks')
      .update({
        status: 'paid',
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', dispute.task_id)
      .eq('status', 'disputed');

    const escrowAmount = task.escrow_amount || task.budget;
    const escrowCents = Math.round(escrowAmount * 100);
    const workerFeePercent = task.worker_fee_percent != null ? task.worker_fee_percent : PLATFORM_FEE_PERCENT;
    const platformFeeCents = Math.round(escrowCents * workerFeePercent / 100);
    const netAmount = (escrowCents - platformFeeCents) / 100;

    await createNotification(
      dispute.filed_against, 'dispute_resolved', 'Dispute Resolved - Payment Released',
      `The dispute for task "${taskTitle}" was resolved in your favor. Payment of $${netAmount.toFixed(2)} has been released.`,
      `/disputes/${id}`
    );
    await createNotification(
      dispute.filed_by, 'dispute_resolved', 'Dispute Resolved - Payment Released to Human',
      `The dispute for task "${taskTitle}" was resolved in favor of the human.`,
      `/disputes/${id}`
    );

  } else if (resolution === 'partial') {
    // === PARTIAL RESOLUTION: Reset task for re-review ===
    // Atomic task update with status precondition
    await supabase
      .from('tasks')
      .update({
        status: 'pending_review',
        proof_submitted_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution: resolution,
        updated_at: new Date().toISOString()
      })
      .eq('id', dispute.task_id)
      .eq('status', 'disputed');

    await createNotification(
      dispute.filed_by, 'dispute_resolved', 'Dispute Partially Resolved',
      `The dispute for task "${taskTitle}" has been partially resolved. The task has been returned for re-review.`,
      `/disputes/${id}`
    );
    await createNotification(
      dispute.filed_against, 'dispute_resolved', 'Dispute Partially Resolved',
      `The dispute for task "${taskTitle}" has been partially resolved. Please re-review and resubmit.`,
      `/disputes/${id}`
    );

  } else {
    // Default: Human wins — release the payment
    if (dispute.payout?.id) {
      await supabase.from('payouts').update({ status: 'available' }).eq('id', dispute.payout.id);
    }

    await createNotification(
      dispute.filed_against, 'dispute_resolved', 'Dispute Resolved - Payment Released',
      `The dispute for task "${taskTitle}" was resolved in your favor. Payment has been released.`,
      `/disputes/${id}`
    );
    await createNotification(
      dispute.filed_by, 'dispute_resolved', 'Dispute Resolved - Payment Released to Human',
      `The dispute for task "${taskTitle}" was resolved in favor of the human.`,
      `/disputes/${id}`
    );
  }

  res.json({
    success: true,
    message: `Dispute resolved: ${resolution}`,
    dispute: { ...dispute, status: 'resolved' }
  });
});

