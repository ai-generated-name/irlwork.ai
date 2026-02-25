/**
 * Validation types for the task validation pipeline.
 *
 * ValidationError: structured error returned by validators.
 * All fields designed so an LLM agent can self-correct based on the error alone.
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field           - which field has the issue
 * @property {string} code            - machine-readable error code (see error-codes.js)
 * @property {string} message         - human/agent-readable explanation
 * @property {string} [suggestion]    - optional fix suggestion
 * @property {string} [detected]      - what was detected (e.g. partially masked PII)
 * @property {Object} [constraint]    - the constraint that was violated
 * @property {number} [constraint.min]
 * @property {number} [constraint.max]
 * @property {string[]} [constraint.allowed_values]
 * @property {string} [constraint.required_type]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {ValidationError[]} errors
 * @property {ValidationError[]} warnings
 */

/**
 * @typedef {Object} TaskTypeConfig
 * @property {string} id
 * @property {string} display_name
 * @property {string} description
 * @property {string} category
 * @property {string[]} required_fields
 * @property {string[]} optional_fields
 * @property {Object} field_schemas
 * @property {number} minimum_budget_usd
 * @property {number} maximum_duration_hr
 * @property {string[]} prohibited_keywords
 * @property {boolean} requires_address
 * @property {boolean} is_active
 */

/**
 * Create a ValidationError object.
 */
function makeError(field, code, message, extras = {}) {
  const error = { field, code, message };
  if (extras.suggestion) error.suggestion = extras.suggestion;
  if (extras.detected) error.detected = extras.detected;
  if (extras.constraint) error.constraint = extras.constraint;
  return error;
}

/**
 * Create a ValidationResult.
 */
function makeResult(errors = [], warnings = []) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

module.exports = { makeError, makeResult };
