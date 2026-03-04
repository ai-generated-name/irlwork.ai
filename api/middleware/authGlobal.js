/**
 * Global Authentication Middleware
 *
 * Every route requires authentication UNLESS it appears in PUBLIC_ROUTES.
 * To add a new public route, add it to the allowlist below and document
 * why it doesn't need auth.
 *
 * MCP routes (/api/mcp) use their own API-key auth and are excluded here.
 */

// Routes that don't require JWT authentication.
// Each entry: { method, path } — path matching is prefix-based.
const PUBLIC_ROUTES = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/ready' },
  { method: 'GET', path: '/api/health' },
  { method: 'POST', path: '/api/stripe/webhook' },      // Stripe signature verification
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'GET', path: '/api/tasks/browse' },          // Public task listing
  { method: 'GET', path: '/api/tasks/:id/stats' },       // Public task stats
  { method: 'POST', path: '/api/views' },                // Page view tracking
];

// Routes that use alternative auth (API key) — handled by their own middleware
const API_KEY_ROUTE_PREFIXES = ['/api/mcp'];

function isPublicRoute(method, path) {
  return PUBLIC_ROUTES.some(route => {
    if (route.method !== method) return false;
    // Handle parameterized routes like /api/tasks/:id/stats
    const routeParts = route.path.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, i) =>
      part.startsWith(':') || part === pathParts[i]
    );
  });
}

function isApiKeyRoute(path) {
  return API_KEY_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

/**
 * Create auth middleware with the provided getUserByToken function.
 * getUserByToken is defined in server.js, so we accept it as a dependency.
 */
function createAuthMiddleware(getUserByToken) {
  return async function authMiddleware(req, res, next) {
    // Skip CORS preflight
    if (req.method === 'OPTIONS') return next();

    // Skip public routes
    if (isPublicRoute(req.method, req.path)) return next();

    // Skip API-key routes (they do their own auth)
    if (isApiKeyRoute(req.path)) return next();

    // Standard JWT auth
    try {
      const user = await getUserByToken(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

module.exports = { createAuthMiddleware, PUBLIC_ROUTES };
