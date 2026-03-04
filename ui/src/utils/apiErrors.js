/**
 * API Error Parsing Utility
 *
 * Handles both legacy and standardized error response formats:
 * - Legacy:  { error: "Human readable message" }
 * - Standard: { error: { code: "MACHINE_READABLE", message: "Human readable", status: 400 } }
 * - Validation: { error: { code: "VALIDATION_ERROR", message: "...", details: [...] } }
 */

/**
 * Extract a human-readable error message from an API response body.
 * @param {object} data - Parsed JSON response body
 * @param {string} [fallback='Something went wrong'] - Fallback message
 * @returns {string} Human-readable error message
 */
export function getErrorMessage(data, fallback = 'Something went wrong') {
  if (!data) return fallback;

  const err = data.error;

  // Legacy format: { error: "string" }
  if (typeof err === 'string') return err;

  // Standard format: { error: { message: "string" } }
  if (err && typeof err === 'object') {
    if (err.message) return err.message;
    if (err.code) return err.code;
  }

  // Flat hybrid: { message: "string" } or { error: "string", message: "string" }
  if (data.message && typeof data.message === 'string') return data.message;

  return fallback;
}

/**
 * Extract the machine-readable error code from an API response.
 * @param {object} data - Parsed JSON response body
 * @returns {string|null}
 */
export function getErrorCode(data) {
  if (!data) return null;
  if (data.error && typeof data.error === 'object' && data.error.code) {
    return data.error.code;
  }
  if (data.code) return data.code;
  return null;
}

/**
 * Extract validation error details from an API response.
 * @param {object} data - Parsed JSON response body
 * @returns {string[]|null} Array of validation error strings, or null
 */
export function getValidationErrors(data) {
  if (!data) return null;
  if (data.error && typeof data.error === 'object' && Array.isArray(data.error.details)) {
    return data.error.details;
  }
  return null;
}
