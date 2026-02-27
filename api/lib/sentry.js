/**
 * Sentry Error Tracking Integration
 *
 * Initializes Sentry for the API server. Gracefully skips if SENTRY_DSN is not set.
 * Must be imported and initialized BEFORE all other middleware in server.js.
 *
 * Usage:
 *   const { initSentry, sentryErrorHandler, captureException } = require('./lib/sentry');
 *   initSentry(app);
 *   // ... all other middleware and routes ...
 *   app.use(sentryErrorHandler());
 */

const Sentry = require('@sentry/node');

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

let initialized = false;

/**
 * Initialize Sentry SDK. Call once at server startup before middleware registration.
 * @param {import('express').Application} app - Express app instance
 */
function initSentry(app) {
  if (!SENTRY_DSN) {
    console.log('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
    integrations: [
      Sentry.expressIntegration({ app }),
    ],
    // Don't send PII by default
    sendDefaultPii: false,
  });

  initialized = true;
  console.log(`[Sentry] Initialized (environment: ${SENTRY_ENVIRONMENT})`);
}

/**
 * Returns Sentry Express error handler middleware.
 * Place this AFTER all routes but BEFORE your final error handler.
 */
function sentryErrorHandler() {
  if (!initialized) {
    // Return no-op middleware if Sentry is not initialized
    return (err, req, res, next) => next(err);
  }
  return Sentry.expressErrorHandler();
}

/**
 * Capture an exception with optional context.
 * Safe to call even when Sentry is not initialized (no-op).
 *
 * @param {Error} error - The error to capture
 * @param {Object} [context] - Additional context (tags, extras, user)
 * @param {Object} [context.tags] - Key-value tags for filtering
 * @param {Object} [context.extra] - Extra data attached to the event
 * @param {Object} [context.user] - User context { id, email, type }
 */
function captureException(error, context = {}) {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    if (context.user) {
      scope.setUser(context.user);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context for the current scope.
 * @param {Object|null} user - User object { id, email, type } or null to clear
 */
function setUser(user) {
  if (!initialized) return;
  Sentry.setUser(user);
}

module.exports = {
  initSentry,
  sentryErrorHandler,
  captureException,
  setUser,
  Sentry,
};
