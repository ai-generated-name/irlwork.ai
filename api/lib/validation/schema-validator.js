/**
 * Schema Validator (Gate 1)
 *
 * Validates task payload against the task type's field schema:
 *   - Task type exists and is active
 *   - All required fields present and non-empty
 *   - Field type/value constraints (type, min, max, enums, string length, array min_items)
 *   - datetime_start is at least 1 hour in the future
 *   - duration_hours and budget_usd within task type limits
 *   - Unknown fields flagged as warnings
 */

const { makeError, makeResult } = require('./types');
const EC = require('./error-codes');

/**
 * @param {Object} input - The task payload
 * @param {Object|null} taskTypeConfig - The task type config from registry, or null if not found
 * @returns {import('./types').ValidationResult}
 */
function validateSchema(input, taskTypeConfig) {
  const errors = [];
  const warnings = [];

  // 1. Task type must exist and be active
  if (!taskTypeConfig) {
    errors.push(makeError('task_type', EC.INVALID_TASK_TYPE,
      `Task type "${input.task_type || input.task_type_id}" not found or is inactive`,
      { suggestion: 'Use GET /api/schemas to see available task types' }
    ));
    // Can't validate further without a config
    return makeResult(errors, warnings);
  }

  const { required_fields, optional_fields, field_schemas, minimum_budget_usd, maximum_duration_hr } = taskTypeConfig;
  const requiredFields = Array.isArray(required_fields) ? required_fields : [];
  const optionalFields = Array.isArray(optional_fields) ? optional_fields : [];
  const schemas = field_schemas || {};

  // 2. Check all required fields are present and non-empty
  for (const field of requiredFields) {
    const value = input[field];
    if (value === undefined || value === null || value === '') {
      errors.push(makeError(field, EC.MISSING_REQUIRED,
        `"${field}" is required for ${taskTypeConfig.display_name} tasks`,
        {
          constraint: schemas[field] ? { required_type: schemas[field].type } : undefined,
          suggestion: `Provide a value for "${field}"`
        }
      ));
    }
  }

  // 3. Validate each field against its schema
  for (const [field, schema] of Object.entries(schemas)) {
    const value = input[field];

    // Skip if field is missing — already caught by required check above
    if (value === undefined || value === null || value === '') continue;

    // Type check
    if (schema.type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) {
        errors.push(makeError(field, EC.INVALID_TYPE,
          `"${field}" must be a number, got "${typeof value}"`,
          { constraint: { required_type: 'number' } }
        ));
        continue;
      }

      if (schema.min !== undefined && num < schema.min) {
        errors.push(makeError(field, EC.BELOW_MINIMUM,
          `"${field}" must be at least ${schema.min}. Submitted: ${num}`,
          { constraint: { min: schema.min } }
        ));
      }
      if (schema.max !== undefined && num > schema.max) {
        errors.push(makeError(field, EC.ABOVE_MAXIMUM,
          `"${field}" must be at most ${schema.max}. Submitted: ${num}`,
          { constraint: { max: schema.max } }
        ));
      }
    }

    if (schema.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(makeError(field, EC.INVALID_TYPE,
          `"${field}" must be a string, got "${typeof value}"`,
          { constraint: { required_type: 'string' } }
        ));
        continue;
      }

      if (schema.min_length !== undefined && value.length < schema.min_length) {
        errors.push(makeError(field, EC.STRING_TOO_SHORT,
          `"${field}" must be at least ${schema.min_length} characters. Current: ${value.length}`,
          { constraint: { min: schema.min_length } }
        ));
      }
      if (schema.max_length !== undefined && value.length > schema.max_length) {
        errors.push(makeError(field, EC.STRING_TOO_LONG,
          `"${field}" must be at most ${schema.max_length} characters. Current: ${value.length}`,
          { constraint: { max: schema.max_length } }
        ));
      }
    }

    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(makeError(field, EC.INVALID_TYPE,
          `"${field}" must be an array, got "${typeof value}"`,
          { constraint: { required_type: 'array' } }
        ));
        continue;
      }

      if (schema.min_items !== undefined && value.length < schema.min_items) {
        errors.push(makeError(field, EC.ARRAY_TOO_FEW,
          `"${field}" must have at least ${schema.min_items} item(s). Current: ${value.length}`,
          { constraint: { min: schema.min_items } }
        ));
      }

      if (schema.allowed_values) {
        const invalid = value.filter(v => !schema.allowed_values.includes(v));
        if (invalid.length > 0) {
          errors.push(makeError(field, EC.INVALID_VALUE,
            `"${field}" contains invalid values: ${invalid.join(', ')}`,
            {
              constraint: { allowed_values: schema.allowed_values },
              suggestion: `Allowed values: ${schema.allowed_values.join(', ')}`
            }
          ));
        }
      }
    }
  }

  // 4. Validate datetime_start
  if (input.datetime_start) {
    const dt = new Date(input.datetime_start);
    if (isNaN(dt.getTime())) {
      errors.push(makeError('datetime_start', EC.INVALID_DATETIME,
        'datetime_start is not a valid date/time string',
        { suggestion: 'Use ISO 8601 format, e.g. "2025-03-15T14:00:00Z"' }
      ));
    } else {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      if (dt < oneHourFromNow) {
        errors.push(makeError('datetime_start', EC.INVALID_DATETIME,
          'datetime_start must be at least 1 hour in the future',
          { suggestion: 'Set datetime_start to a future date/time, at least 1 hour from now' }
        ));
      }
    }
  }

  // 5. Validate budget against task type minimum
  if (input.budget_usd !== undefined && input.budget_usd !== null) {
    const budget = parseFloat(input.budget_usd);
    if (!isNaN(budget) && minimum_budget_usd && budget < minimum_budget_usd) {
      errors.push(makeError('budget_usd', EC.BUDGET_BELOW_MINIMUM,
        `Minimum budget for ${taskTypeConfig.display_name} tasks is $${minimum_budget_usd}. Submitted: $${budget}`,
        { constraint: { min: minimum_budget_usd } }
      ));
    }
  }

  // 6. Validate duration against task type maximum
  if (input.duration_hours !== undefined && input.duration_hours !== null) {
    const duration = parseFloat(input.duration_hours);
    if (!isNaN(duration) && maximum_duration_hr && duration > maximum_duration_hr) {
      errors.push(makeError('duration_hours', EC.DURATION_EXCEEDS_MAX,
        `Maximum duration for ${taskTypeConfig.display_name} tasks is ${maximum_duration_hr} hours. Submitted: ${duration}`,
        { constraint: { max: maximum_duration_hr } }
      ));
    }
  }

  // 7. Warn on unknown fields
  const allKnownFields = new Set([
    ...requiredFields,
    ...optionalFields,
    // Base fields that are always accepted
    'task_type', 'task_type_id', 'title', 'location_lat', 'location_lng',
    'latitude', 'longitude', 'is_remote', 'country', 'country_code',
  ]);

  for (const field of Object.keys(input)) {
    if (!allKnownFields.has(field)) {
      warnings.push(makeError(field, EC.UNKNOWN_FIELD,
        `Unknown field "${field}" is not defined for ${taskTypeConfig.display_name} tasks`,
        { suggestion: `Check GET /api/schemas/${taskTypeConfig.id} for valid fields` }
      ));
    }
  }

  return makeResult(errors, warnings);
}

module.exports = { validateSchema };
