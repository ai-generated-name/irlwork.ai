/**
 * Standardized API Response Helpers
 *
 * Ensures consistent response shapes across all REST and MCP endpoints.
 *
 * Success: { data: { ... } }
 * Error:   { error: { code: "MACHINE_READABLE", message: "Human readable", status: 400 } }
 * Validation: { error: { code: "VALIDATION_ERROR", message: "Validation failed", status: 400, details: [...] } }
 *
 * Usage:
 *   const { success, error, notFound, conflict, validationError } = require('./utils/response');
 */

const success = (res, data, status = 200) =>
  res.status(status).json({ data });

const error = (res, code, message, status = 400) =>
  res.status(status).json({ error: { code, message, status } });

const validationError = (res, details) =>
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details } });

const notFound = (res, resource = 'Resource') =>
  error(res, 'NOT_FOUND', `${resource} not found`, 404);

const conflict = (res, message) =>
  error(res, 'CONFLICT', message, 409);

const unauthorized = (res) =>
  error(res, 'UNAUTHORIZED', 'Authentication required', 401);

const forbidden = (res) =>
  error(res, 'FORBIDDEN', 'Access denied', 403);

const tooManyRequests = (res, message = 'Too many requests') =>
  error(res, 'RATE_LIMIT_EXCEEDED', message, 429);

const paymentRequired = (res, message = 'Payment method required') =>
  error(res, 'PAYMENT_REQUIRED', message, 402);

const serverError = (res, message = 'Internal server error') =>
  error(res, 'INTERNAL_ERROR', message, 500);

/**
 * Format an MCP error result (no res object, returns plain object).
 */
const mcpError = (code, message, status = 400) =>
  ({ error: { code, message, status } });

/**
 * Format an MCP validation error result.
 */
const mcpValidationError = (details) =>
  ({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', status: 400, details } });

module.exports = {
  success,
  error,
  validationError,
  notFound,
  conflict,
  unauthorized,
  forbidden,
  tooManyRequests,
  paymentRequired,
  serverError,
  mcpError,
  mcpValidationError
};
