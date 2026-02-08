/**
 * Admin Authentication Middleware
 * Phase 1 Manual Operations - requires ADMIN_USER_IDS environment variable
 */

// Read admin user IDs from environment variable
// Format: ADMIN_USER_IDS=uuid1,uuid2,uuid3
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

if (ADMIN_USER_IDS.length === 0) {
  console.warn('[AdminAuth] Warning: ADMIN_USER_IDS environment variable not set. No users will have admin access.');
}

/**
 * Middleware to require admin authentication
 * Must be used after getUserByToken has set req.user
 *
 * Usage in routes:
 *   const { adminAuth, setUser } = require('./middleware/adminAuth');
 *
 *   // Option 1: Apply to all routes in a router
 *   router.use(setUser(supabase, getUserByToken));
 *   router.use(adminAuth);
 *
 *   // Option 2: Apply to individual routes
 *   app.get('/api/admin/dashboard', setUser(supabase, getUserByToken), adminAuth, handler);
 */
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!ADMIN_USER_IDS.includes(req.user.id)) {
    console.log(`[AdminAuth] Access denied for user ${req.user.id} (${req.user.email})`);
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  // Admin access granted
  console.log(`[AdminAuth] Admin access granted for ${req.user.email}`);
  next();
};

/**
 * Middleware factory to set req.user from Authorization header
 * This is a helper to avoid duplicating getUserByToken logic in routes
 */
const setUser = (supabase, getUserByToken) => async (req, res, next) => {
  try {
    const token = req.headers.authorization || req.headers['x-api-key'];
    if (token && supabase) {
      req.user = await getUserByToken(token);
    }
    next();
  } catch (error) {
    console.error('[AdminAuth] Error setting user:', error.message);
    next();
  }
};

/**
 * Check if a user ID is an admin
 */
const isAdmin = (userId) => {
  return ADMIN_USER_IDS.includes(userId);
};

/**
 * Get list of admin user IDs (for debugging)
 */
const getAdminUserIds = () => {
  return [...ADMIN_USER_IDS];
};

module.exports = {
  adminAuth,
  setUser,
  isAdmin,
  getAdminUserIds
};
